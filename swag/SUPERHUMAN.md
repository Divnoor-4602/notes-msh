# Sending swag emails through Superhuman

The Superhuman Mail MCP server lets an AI client send email from your actual
mailbox. This is how you use it to drain the swag outbox, so every link arrives
as a normal message from you rather than a transactional blast.

## What you need

- A Superhuman Mail account on the Business or Enterprise plan with Ask AI
  turned on
- An MCP client that supports remote HTTP servers, such as Cursor, Claude or
  ChatGPT
- Your deployment's `ADMIN_KEY`

## Why the backend cannot do this for you

The Superhuman MCP server authenticates a person through OAuth inside an AI
client. There is no API key a Convex action could hold, so nothing on the
server can call `send_draft` on its own. The app works around that by exposing
the queue over HTTP and letting your assistant be the sender.

That is the trade. Mail comes from you, and in exchange sending is something
you kick off rather than something that happens on submit.

## Connect the MCP server

Add the remote server to your client. In Cursor, `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "superhuman-mail": {
      "url": "https://mcp.mail.superhuman.com/mcp"
    }
  }
}
```

Approve the OAuth prompt on first use. Keep the confirm-before-send option on
until you trust the flow.

## The outbox API

Both endpoints authenticate with `Authorization: Bearer <ADMIN_KEY>`.

**Read what is waiting**

```bash
curl -H "Authorization: Bearer $SWAG_ADMIN_KEY" \
  "https://<deployment>.convex.site/api/outbox/pending?limit=25"
```

```json
{
  "count": 1,
  "emails": [
    {
      "id": "jh7etspdvm3xqt8c1ztwrcxpkd8bt5ra",
      "to": "ada@example.com",
      "toName": "Ada Lovelace",
      "twitterHandle": "adalovelace",
      "subject": "Ada, your Convex swag is ready",
      "html": "<!doctype html>...",
      "text": "Friends of Convex...",
      "linkUrl": "https://yourshop.fourthwall.com/gift/abc123",
      "createdAt": 1785883261862
    }
  ]
}
```

**Mark them sent**

```bash
curl -X POST \
  -H "Authorization: Bearer $SWAG_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{"ids":["jh7etspdvm3xqt8c1ztwrcxpkd8bt5ra"]}' \
  "https://<deployment>.convex.site/api/outbox/sent"
```

```json
{ "marked": 1, "skipped": 0 }
```

Ids already marked sent come back under `skipped`, so replaying a request never
mails anyone twice.

## The prompt

The Outbox tab in `/admin` shows this with your real URL filled in and a copy
button.

```
Send the pending Convex swag emails from my Superhuman account.

1. GET https://<deployment>.convex.site/api/outbox/pending with header
   "Authorization: Bearer $SWAG_ADMIN_KEY".
2. For each email in the response, call the Superhuman send_draft tool with:
   To: the "to" field
   Subject: the "subject" field
   HTML body: the "html" field, exactly as given, do not rewrite it
3. Straight after each successful send, POST the id back so it is not sent twice:
   POST https://<deployment>.convex.site/api/outbox/sent
   Header: Authorization: Bearer $SWAG_ADMIN_KEY
   Body: {"ids": ["<the id>"]}

Each link is single use. Never send the same id twice, and stop and tell me if
a send fails.
```

## Rules worth keeping

**Send the HTML as given.** Superhuman will happily rewrite a message in your
voice. Let it do that for replies, not for this. The body carries a single use
link, and a rewrite can drop or mangle it.

**Mark each id sent immediately after its send returns**, not in one batch at
the end. If the run dies halfway, the rows that already went out are recorded
and the rest stay queued.

**One id, one person, one link.** If a send fails, leave the row pending or
requeue it from the dashboard. Do not retry by re-reading and re-sending the
whole list without marking as you go.

## If something goes wrong

A send that fails on your end leaves the row pending, so the next run picks it
up. Nothing is lost.

If you sent an email outside this flow, open the Outbox tab and hit **Mark
sent** on that row so it stops reappearing.

To put a row back in the queue, use **Requeue** on the failed list in the
dashboard, or call `outbox:markPending` with the id.
