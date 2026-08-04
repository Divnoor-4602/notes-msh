import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Send } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "../ui/Button";
import { Card, CopyBlock, EmptyState, Stat, StatGrid } from "./Panel";

/**
 * The Superhuman Mail MCP server runs inside your AI client, not inside
 * Convex, so there is no way for the backend to call it on submit. This panel
 * is the handoff: it shows what is waiting and gives you the prompt that makes
 * your assistant send it from your own mailbox.
 */
export function OutboxPanel({ adminKey }: { adminKey: string }) {
  const stats = useQuery(api.outbox.stats, { key: adminKey });
  const pending = useQuery(api.outbox.listPending, { key: adminKey, limit: 25 });
  const failed = useQuery(api.outbox.listByStatus, {
    key: adminKey,
    status: "failed",
    limit: 10,
  });
  const markSent = useMutation(api.outbox.markSent);
  const markPending = useMutation(api.outbox.markPending);

  const [busy, setBusy] = useState(false);

  const apiBase = window.location.origin;
  const assistantPrompt = `Send the pending Convex swag emails from my Superhuman account.

1. GET ${apiBase}/api/outbox/pending with header "Authorization: Bearer $SWAG_ADMIN_KEY".
2. For each email in the response, call the Superhuman send_draft tool with:
   To: the "to" field
   Subject: the "subject" field
   HTML body: the "html" field, exactly as given, do not rewrite it
3. Straight after each successful send, POST the id back so it is not sent twice:
   POST ${apiBase}/api/outbox/sent
   Header: Authorization: Bearer $SWAG_ADMIN_KEY
   Body: {"ids": ["<the id>"]}

Each link is single use. Never send the same id twice, and stop and tell me if a send fails.`;

  async function handleMarkSent(ids: Array<Id<"outbox">>) {
    setBusy(true);
    try {
      await markSent({ key: adminKey, ids, channel: "superhuman" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <StatGrid>
        <Stat label="Pending" value={stats?.pending ?? "-"} emphasis />
        <Stat label="Sending" value={stats?.sending ?? "-"} />
        <Stat label="Sent" value={stats?.sent ?? "-"} />
        <Stat label="Failed" value={stats?.failed ?? "-"} emphasis />
      </StatGrid>

      <Card
        title="Send through Superhuman"
        description="Paste this into an AI client connected to the Superhuman Mail MCP server. It reads the queue, sends each email from your mailbox, and marks them sent so nobody gets two links."
      >
        <CopyBlock text={assistantPrompt} label="Assistant prompt" />
      </Card>

      <Card
        title={`Waiting to send${pending ? ` (${pending.length})` : ""}`}
        description="Mark rows sent by hand if you delivered them some other way."
      >
        {pending === undefined ? (
          <EmptyState>Loading</EmptyState>
        ) : pending.length === 0 ? (
          <EmptyState>Nothing waiting. The queue is clear.</EmptyState>
        ) : (
          <div className="flex flex-col gap-2">
            {pending.map((email) => (
              <div
                key={email.id}
                className="flex items-center justify-between gap-4 rounded-xl border border-line bg-ink p-4"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">
                    {email.toName}
                    <span className="ml-2 text-mute-dim">
                      @{email.twitterHandle}
                    </span>
                  </div>
                  <div className="mt-0.5 truncate font-mono text-xs text-mute">
                    {email.to}
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={busy}
                  onClick={() => handleMarkSent([email.id])}
                >
                  <Send className="size-3.5" />
                  Mark sent
                </Button>
              </div>
            ))}

            <Button
              variant="secondary"
              size="sm"
              disabled={busy}
              className="mt-2 self-start"
              onClick={() => handleMarkSent(pending.map((email) => email.id))}
            >
              Mark all {pending.length} sent
            </Button>
          </div>
        )}
      </Card>

      {failed && failed.length > 0 ? (
        <Card
          title={`Failed (${failed.length})`}
          description="These bounced or errored. Requeue to try again."
        >
          <div className="flex flex-col gap-2">
            {failed.map((row) => (
              <div
                key={row._id}
                className="flex items-center justify-between gap-4 rounded-xl border border-line-bright bg-ink p-4"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{row.toName}</div>
                  <div className="mt-0.5 truncate font-mono text-xs text-mute">
                    {row.to}
                  </div>
                  {row.error ? (
                    <div className="mt-1 truncate text-xs text-mute-dim">
                      {row.error}
                    </div>
                  ) : null}
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={busy}
                  onClick={() =>
                    markPending({ key: adminKey, ids: [row._id] })
                  }
                >
                  Requeue
                </Button>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
