import { useState, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

export function Card({
  title,
  description,
  children,
  className,
}: {
  title?: string;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn("rounded-2xl border border-line bg-ink-soft/60 p-6", className)}
    >
      {title ? (
        <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
      ) : null}
      {description ? (
        <p className="mt-1.5 text-sm leading-relaxed text-mute">{description}</p>
      ) : null}
      <div className={title || description ? "mt-5" : undefined}>{children}</div>
    </section>
  );
}

export function StatGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{children}</div>;
}

export function Stat({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: number | string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        emphasis && value !== 0
          ? "border-line-bright bg-line/30"
          : "border-line bg-ink-soft"
      )}
    >
      <div className="text-[11px] font-medium tracking-[0.12em] text-mute-dim uppercase">
        {label}
      </div>
      <div className="mt-1.5 text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

/** Read-only block of text with a copy button, used for prompts and commands. */
export function CopyBlock({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="relative rounded-xl border border-line bg-ink p-4">
      {label ? (
        <div className="mb-2 text-[11px] font-medium tracking-[0.12em] text-mute-dim uppercase">
          {label}
        </div>
      ) : null}
      <pre className="overflow-x-auto pr-10 font-mono text-[12px] leading-relaxed whitespace-pre-wrap text-mute">
        {text}
      </pre>
      <button
        onClick={copy}
        aria-label="Copy"
        className="absolute top-3 right-3 rounded-lg border border-line-bright p-2 text-mute transition-colors hover:text-chalk"
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      </button>
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-line py-10 text-center text-sm text-mute-dim">
      {children}
    </div>
  );
}
