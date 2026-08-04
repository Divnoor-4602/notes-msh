import { useState } from "react";
import { ArrowUpRight, Check, Copy, Mail } from "lucide-react";
import { Button } from "./ui/Button";
import type { ClaimOutcome } from "./ClaimForm";

type SuccessPanelProps = {
  outcome: ClaimOutcome;
};

export function SuccessPanel({ outcome }: SuccessPanelProps) {
  const [copied, setCopied] = useState(false);
  const returning = outcome.status === "already_claimed";

  async function copyLink() {
    if (!outcome.linkUrl) return;
    await navigator.clipboard.writeText(outcome.linkUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="animate-rise flex flex-col gap-6">
      <div className="flex size-11 items-center justify-center rounded-full border border-line-bright bg-ink-soft">
        <Check className="size-5 text-chalk" strokeWidth={2.5} />
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-2xl font-semibold tracking-tight">
          {returning ? "You are already on the list" : "You are all set"}
        </h2>
        <p className="text-[15px] leading-relaxed text-mute">
          {returning
            ? "We found the link we already reserved for you. It is the same one, so check your inbox if you cannot use it here."
            : "Your link is on its way to your inbox. It works once, so keep it to yourself."}
        </p>
      </div>

      {outcome.linkUrl ? (
        <div className="flex flex-col gap-3">
          <div className="rounded-xl border border-line bg-ink-soft p-4">
            <div className="mb-2 text-[11px] font-medium tracking-[0.14em] text-mute-dim uppercase">
              Your link
            </div>
            <div className="font-mono text-[13px] break-all text-chalk">
              {outcome.linkUrl}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => window.open(outcome.linkUrl ?? "", "_blank")}
              className="flex-1"
            >
              Claim your swag
              <ArrowUpRight className="size-4" />
            </Button>
            <Button variant="secondary" onClick={copyLink} aria-label="Copy link">
              {copied ? (
                <Check className="size-4" />
              ) : (
                <Copy className="size-4" />
              )}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3 rounded-xl border border-line bg-ink-soft p-4">
          <Mail className="mt-0.5 size-4 shrink-0 text-mute" />
          <p className="text-sm leading-relaxed text-mute">
            Check your inbox. If it has not landed in a few minutes, look in
            spam before reaching out.
          </p>
        </div>
      )}
    </div>
  );
}
