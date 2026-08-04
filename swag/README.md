# Friends of Convex

A single page app for handing out free swag. People you invite fill in their
name, X handle and email. The app hands each person one Fourthwall giveaway
link from a pool you imported, then emails it to them from you.

Backend, database, HTTP API and the frontend itself all run on one Convex
deployment. There is no second host and no DNS to point anywhere.

## How it works

```
Fourthwall CSV  ->  admin imports links  ->  pool of unclaimed links
                                                     |
person fills the form  ->  claims.submit  ->  assigns exactly one link
                                                     |
                                              outbox row (pending)
                                                     |
                          +--------------------------+-------------------------+
                          |                                                    |
                 Resend component                                 Superhuman Mail MCP
                 sends immediately                          your assistant sends it as you
```

The outbox is the single source of truth. Both delivery paths drain the same
queue and mark the same rows sent, so a link can never go out twice.

## Choosing how email gets sent

This was the open question, and the answer is that the two options are not
interchangeable.

**Superhuman Mail MCP** is real and it does send email. The server lives at
`https://mcp.mail.superhuman.com/mcp`, authenticates over OAuth, and exposes a
`send_draft` tool. What it is not is a server to server API. It authenticates a
person in an AI client, not a backend holding a key, so a Convex action cannot
call it when someone submits the form. It needs a Superhuman Mail account on
the Business or Enterprise plan with Ask AI turned on.

What it gives you that nothing else does: the email genuinely comes from your
mailbox, lands in the recipient's normal thread with you, and can be written in
your voice. For a few dozen friends that is the whole point.

**Resend** through the `@convex-dev/resend` component is the opposite trade. It
sends the instant someone submits, with retries and delivery webhooks, from a
domain you verified. It reads like a transactional email, since it is one.

Set `DELIVERY_MODE` to pick:

| Mode | Behaviour | Use when |
| --- | --- | --- |
| `superhuman` (default) | Claims queue in the outbox. You drain them from an AI client connected to Superhuman. | The personal touch matters more than the wait |
| `resend` | Sent automatically on submit. | You want people to get their link in seconds |

Either way the recipient sees the same subject and body, so switching modes
does not change what lands in the inbox. Setting up Superhuman is covered in
[SUPERHUMAN.md](./SUPERHUMAN.md).

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
npx convex env set DELIVERY_MODE "superhuman"
```

`ADMIN_KEY` is the password for `/admin` and for the outbox HTTP API. Print it
somewhere you can find it, and rotate it after an event.

For `resend` mode, add:

```bash
npx convex env set RESEND_API_KEY "re_..."
npx convex env set EMAIL_FROM "Ada <ada@yourdomain.com>"
npx convex env set EMAIL_REPLY_TO "ada@yourdomain.com"
```

Then point a Resend webhook at `https://<deployment>.convex.site/api/resend-webhook`
so bounces show up in the admin dashboard.

## Loading Fourthwall links

In Fourthwall, go to Promotions, then Create promotion, then Giveaway links.
Pick one product, enter how many links you need, save, then click **Export
links** to get the CSV.

Open `/admin`, go to the Links tab, and either upload that CSV or paste the
column of links from your spreadsheet. The importer scans for URLs rather than
parsing columns, so the exact CSV layout does not matter. Links are deduped on
their code, and re-importing the same file imports nothing new.

Giveaway links are single use and charge your card on file for the product and
shipping when someone redeems one.

Fourthwall also has a `POST /open-api/v1.0/giveaway-links` endpoint behind the
`giveaway_write` scope if you would rather generate links from code. That is
not wired up here, since the CSV path needs no API key and matches how the
dashboard already works.

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
- **Links** imports giveaway links and shows how many are left
- **Claims** lists everyone who signed up with their delivery status, and
  exports a CSV
- **Settings** closes claims, and controls whether the link is shown on screen
  as well as emailed

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
