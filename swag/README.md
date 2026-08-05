# Friends of Convex

A single page app for handing out free swag. People you invite fill in their
name, X handle and email. The app hands each person one Fourthwall giveaway
link from a pool you imported, then emails it to them from you.

Backend, database, HTTP API and the frontend itself all run on one Convex
deployment. There is no second host and no DNS to point anywhere.

## How it works

```
Fourthwall API or CSV  ->  pool of unclaimed links
                                    |
person fills the form  ->  claims.submit  ->  assigns exactly one link
                                    |
                             outbox row (pending)
                                    |
             +----------------------+----------------------+
             |                                             |
      Resend component                          Superhuman Mail MCP
      sends immediately                    your assistant sends it as you
```

The outbox is the single source of truth. Both delivery paths drain the same
queue and mark the same rows sent, so a link can never go out twice.

## Choosing how email gets sent

Pick the mode in the admin dashboard under Settings. It is stored in the
database, so you can switch mid event without a redeploy. Both paths produce
the same subject and body, so switching does not change what lands in an inbox.

| Mode | Behaviour |
| --- | --- |
| Superhuman | Claims queue in the outbox. You drain them from an AI client connected to Superhuman, so mail leaves your own mailbox |
| Resend | The Convex Resend component sends the instant someone submits |

**The thing that usually decides it: Resend can only send from a domain you
control.** You verify the domain by adding DNS records, so `EMAIL_FROM` has to
be something like `you@yourdomain.com`. Resend cannot send as `you@gmail.com`,
since you cannot add DNS records to Google's domain. Superhuman connects to the
Gmail or Outlook account itself, so mail comes from your real everyday address.

So, roughly:

- You own a domain and want links delivered in seconds: use Resend. It is less
  work and nothing waits on you
- The mail has to come from your personal address: use Superhuman
- Not sure: start on Superhuman for the first handful, switch to Resend when the
  volume stops being fun

**Superhuman Mail MCP** is real and it does send email. The server lives at
`https://mcp.mail.superhuman.com/mcp`, authenticates over OAuth, and exposes a
`send_draft` tool. What it is not is a server to server API. It authenticates a
person in an AI client, not a backend holding a key, so a Convex action cannot
call it when someone submits the form. It needs a Superhuman Mail account on
the Business or Enterprise plan with Ask AI turned on. Setup is in
[SUPERHUMAN.md](./SUPERHUMAN.md).

**Resend** through the `@convex-dev/resend` component sends automatically, with
retries and delivery webhooks. The dashboard will not let you switch to it
until `RESEND_API_KEY` and `EMAIL_FROM` are both set, since queuing mail that
can never send is worse than refusing the switch.

### What the delivery statuses mean

`resend.sendEmail` enqueues into a workpool rather than calling Resend inline,
so a successful call means "accepted", not "delivered". Rows sit in **sending**
until their fate is known, then move to **sent** or **failed**. Two things
resolve them: the delivery webhook, and a scheduled check that asks the Resend
component directly. The second one exists so the dashboard still tells the
truth on a deployment with no webhook configured.

## Setup

```bash
cd swag
npm install
npx convex dev
```

That provisions a deployment and writes `.env.local`. In a second terminal:

```bash
npm run dev:frontend
```

Then set the deployment configuration:

```bash
npx convex env set ADMIN_KEY "$(openssl rand -hex 24)"
npx convex env set SENDER_NAME "Ada"
```

`ADMIN_KEY` is the password for `/admin` and for the outbox HTTP API. Print it
somewhere you can find it, and rotate it after an event.

For Resend mode, add:

```bash
npx convex env set RESEND_API_KEY "re_..."
npx convex env set EMAIL_FROM "Ada <ada@yourdomain.com>"
npx convex env set EMAIL_REPLY_TO "ada@yourdomain.com"
```

Then point a Resend webhook at `https://<deployment>.convex.site/api/resend-webhook`
so bounces show up in the admin dashboard.

## Loading Fourthwall links

Two ways in. Both land in the same pool and dedupe against each other.

### Generate them through the API

Create an API user in Fourthwall under Settings, then For Developers, then the
OpenAPI tab. That gives a username and password.

```bash
npx convex env set FOURTHWALL_USERNAME "..."
npx convex env set FOURTHWALL_PASSWORD "..."
```

Open `/admin`, go to Links, load your products, pick one, choose how many links
you want, and generate. The app calls
`POST https://api.fourthwall.com/open-api/v1.0/giveaway-links`, gets the links
back, and adds them to the pool in one step. No spreadsheet.

Multi-shop OAuth apps can set `FOURTHWALL_TOKEN` instead of the username and
password pair, which sends a bearer token and needs the `giveaway_write` scope.

### Or import a CSV

In Fourthwall, go to Promotions, then Create promotion, then Giveaway links.
Pick one product, enter how many links you need, save, then click **Export
links**.

Upload that CSV in the Links tab, or paste the column from your spreadsheet.
The importer scans for URLs rather than parsing columns, so the exact layout
does not matter.

### Either way

Links are deduped on their code, so re-importing a file or regenerating adds
nothing twice. Giveaway links are single use, and Fourthwall charges your card
on file for the product and shipping when someone redeems one. Generating links
through the API is a real action in your shop that costs real money.

## Deploying

```bash
npm run deploy
```

That builds the frontend, pushes the Convex functions, and uploads the built
files to the static hosting component. The site ends up at
`https://<deployment>.convex.site`, with `/admin` on the same origin.

## Admin dashboard

`/admin`, unlocked with `ADMIN_KEY`, which is held in `sessionStorage` for the
tab and never written to disk.

- **Outbox** shows what is waiting, the prompt to hand your assistant, and
  buttons to mark rows sent or requeue failures
- **Links** generates links through the Fourthwall API, imports links you
  already have, and shows how many are left
- **Claims** lists everyone who signed up with their delivery status, and
  exports a CSV
- **Settings** picks the delivery mode, closes claims, and controls whether the
  link is shown on screen as well as emailed

## Notes on correctness

Link assignment happens inside one Convex mutation, and mutations are
serializable transactions. Two people submitting at the same instant cannot be
handed the same link: the second transaction conflicts and retries against the
updated status.

Someone submitting twice gets their original link back rather than burning a
second one. Duplicates are caught on email and on X handle, both normalized
first, so `@Ada`, `ada` and `https://x.com/ada` are one person.

Marking an outbox row sent is idempotent. Replaying the same ids reports them
as skipped instead of resending.

Admin access is a shared secret rather than a user session. The claim form is
deliberately anonymous, so there is no identity to check against. Treat
`ADMIN_KEY` like a password.
