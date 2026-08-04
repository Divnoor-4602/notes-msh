# Changelog

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
