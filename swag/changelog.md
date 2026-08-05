# Changelog

## 0.2.0

### Added

- **Generate links through the Fourthwall API.** The Links tab can load your
  products and mint giveaway links straight into the pool, so the CSV export
  and import round trip is optional now. Set `FOURTHWALL_USERNAME` and
  `FOURTHWALL_PASSWORD`, or `FOURTHWALL_TOKEN` for OAuth apps
- **Delivery mode picker in the dashboard.** Superhuman and Resend are now
  chosen under Settings rather than through an environment variable, so the
  mode can change mid event. `DELIVERY_MODE` is still read as the starting
  value for a fresh deployment
- **Guard against switching to Resend before it works.** The dashboard refuses
  the switch until `RESEND_API_KEY` and `EMAIL_FROM` are set, rather than
  queueing mail that can never send
- **Resend status diagnostics.** An admin query reports what the Resend
  component knows about an email, so a row stuck in sending can be explained

### Fixed

- **Resend rows reported "sent" when nothing had been sent.** `sendEmail`
  enqueues into a workpool rather than calling Resend inline, so a successful
  call only means accepted. Rows now stay in sending until the webhook or a
  scheduled reconciliation resolves them to sent or failed. An invalid API key
  used to look like a clean send and now surfaces the real error
- **Reconciliation missed terminal failures.** The Resend component reports
  some failures through `status.status` without setting the matching boolean
  flag, so failed emails were rescheduled instead of being marked failed

## 0.1.0

First version. A swag giveaway app that runs entirely on one Convex
deployment.

### Added

- **Claim form** at `/` collecting name, X handle and email, with the
  confirmation screen showing the assigned link
- **Single link per person.** Assignment happens inside one Convex mutation, so
  simultaneous submissions cannot collide on the same link
- **Duplicate handling** on both email and X handle, normalized first, so a
  repeat submission returns the original link instead of burning another
- **Fourthwall link import** from the CSV export or pasted spreadsheet columns,
  deduped on link code so re-importing a file is safe
- **Outbox queue** as the single source of truth for delivery, with idempotent
  mark sent
- **Two delivery paths off that one queue.** Resend sends automatically on
  submit. Superhuman Mail MCP lets your assistant send from your own mailbox
- **Outbox HTTP API** at `/api/outbox/pending` and `/api/outbox/sent` so an
  MCP-connected assistant can read the queue and record what it sent
- **Admin dashboard** at `/admin` with outbox, links, claims and settings tabs
- **Runtime settings** for closing claims and for hiding the link so email is
  the only way to receive it
- **Resend delivery webhook** that marks bounced and complained mail failed and
  surfaces it for a retry
- **Convex static hosting** serving the built SPA from the same deployment,
  with the `/api` routes taking precedence over the SPA catch-all
