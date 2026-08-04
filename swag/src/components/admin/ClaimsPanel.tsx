import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card, EmptyState } from "./Panel";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  sent: "border-line-bright text-chalk",
  pending: "border-line text-mute",
  sending: "border-line text-mute",
  failed: "border-chalk text-chalk",
  unknown: "border-line text-mute-dim",
};

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ClaimsPanel({ adminKey }: { adminKey: string }) {
  const claims = useQuery(api.claims.listRecent, { key: adminKey, limit: 100 });

  function exportCsv() {
    if (!claims) return;
    const header = "name,twitter_handle,email,link,claimed_at,email_status";
    const rows = claims.map((claim) =>
      [
        claim.name,
        claim.twitterHandle,
        claim.email,
        claim.linkUrl,
        new Date(claim.createdAt).toISOString(),
        claim.emailStatus,
      ]
        // Quote every field so commas in names cannot break the columns.
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(",")
    );

    const blob = new Blob([[header, ...rows].join("\n")], {
      type: "text/csv",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "friends-of-convex-claims.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card
      title={`Claims${claims ? ` (${claims.length})` : ""}`}
      description="Everyone who filled out the form, newest first."
    >
      {claims === undefined ? (
        <EmptyState>Loading</EmptyState>
      ) : claims.length === 0 ? (
        <EmptyState>No claims yet.</EmptyState>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            {claims.map((claim) => (
              <div
                key={claim._id}
                className="flex items-center justify-between gap-4 rounded-xl border border-line bg-ink p-4"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">
                    {claim.name}
                    <span className="ml-2 text-mute-dim">
                      @{claim.twitterHandle}
                    </span>
                  </div>
                  <div className="mt-0.5 truncate font-mono text-xs text-mute">
                    {claim.email}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="hidden text-xs text-mute-dim sm:inline">
                    {formatDate(claim.createdAt)}
                  </span>
                  <span
                    className={cn(
                      "rounded-md border px-2 py-1 text-[11px] font-medium",
                      STATUS_STYLES[claim.emailStatus] ?? STATUS_STYLES.unknown
                    )}
                  >
                    {claim.emailStatus}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={exportCsv}
            className="self-start text-sm text-mute underline underline-offset-4 transition-colors hover:text-chalk"
          >
            Export CSV
          </button>
        </div>
      )}
    </Card>
  );
}
