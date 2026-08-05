import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Check, Mail, UserRound } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Card } from "./Panel";
import { cn } from "@/lib/utils";

type SettingKey = "claimsOpen" | "revealLinkOnClaim";

const SETTINGS: Array<{
  key: SettingKey;
  label: string;
  description: string;
}> = [
  {
    key: "claimsOpen",
    label: "Claims are open",
    description:
      "Turn this off to close the form without taking the site down.",
  },
  {
    key: "revealLinkOnClaim",
    label: "Show the link on screen",
    description:
      "On, people see their link right after submitting and still get the email. Off, email is the only way to receive it, which matters more if you are draining the queue by hand.",
  },
];

export function SettingsPanel({ adminKey }: { adminKey: string }) {
  const settings = useQuery(api.settings.getPublic);
  const admin = useQuery(api.settings.getAdmin, { key: adminKey });
  const setBoolean = useMutation(api.settings.setBoolean);
  const setDeliveryMode = useMutation(api.settings.setDeliveryMode);

  const [error, setError] = useState<string | null>(null);

  async function chooseMode(mode: "superhuman" | "resend") {
    setError(null);
    try {
      await setDeliveryMode({ key: adminKey, mode });
    } catch {
      setError(
        "Set RESEND_API_KEY and EMAIL_FROM on the deployment before switching to Resend."
      );
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Card
        title="How emails get sent"
        description="Both paths drain the same outbox, so switching does not change what a recipient sees."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <ModeCard
            icon={<UserRound className="size-4" />}
            title="Superhuman"
            blurb="Queues in the outbox. You send from your own mailbox through the Superhuman Mail MCP server."
            detail="Comes from your real address. Needs a Business or Enterprise plan, and you have to kick off each batch."
            selected={admin?.deliveryMode === "superhuman"}
            ready
            onSelect={() => chooseMode("superhuman")}
          />
          <ModeCard
            icon={<Mail className="size-4" />}
            title="Resend"
            blurb="Sends automatically the moment someone submits the form."
            detail={
              admin?.resendConfigured
                ? `Sends from ${admin.fromAddress ?? "your verified domain"}.`
                : "Not connected. Set RESEND_API_KEY and EMAIL_FROM, using a domain you can add DNS records to."
            }
            selected={admin?.deliveryMode === "resend"}
            ready={admin?.resendConfigured ?? false}
            onSelect={() => chooseMode("resend")}
          />
        </div>

        {error ? (
          <p role="alert" className="mt-3 text-sm text-chalk">
            {error}
          </p>
        ) : null}

        <p className="mt-4 text-xs leading-relaxed text-mute-dim">
          Signing off as {admin?.senderName ?? "..."}. Change that with
          {" "}
          <code className="font-mono">npx convex env set SENDER_NAME</code>.
        </p>
      </Card>

      <Card title="Claim form">
        <div className="flex flex-col gap-3">
          {SETTINGS.map((setting) => {
            const value = settings?.[setting.key] ?? false;
            return (
              <div
                key={setting.key}
                className="flex items-start justify-between gap-5 rounded-xl border border-line bg-ink p-4"
              >
                <div>
                  <div className="text-sm font-medium">{setting.label}</div>
                  <p className="mt-1 text-xs leading-relaxed text-mute">
                    {setting.description}
                  </p>
                </div>
                <button
                  role="switch"
                  aria-checked={value}
                  aria-label={setting.label}
                  disabled={settings === undefined}
                  onClick={() =>
                    setBoolean({
                      key: adminKey,
                      settingKey: setting.key,
                      value: !value,
                    })
                  }
                  className={cn(
                    "relative mt-0.5 h-6 w-11 shrink-0 rounded-full border transition-colors",
                    value
                      ? "border-chalk bg-chalk"
                      : "border-line-bright bg-ink-soft"
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-1/2 size-4 -translate-y-1/2 rounded-full transition-all",
                      value ? "left-6 bg-ink" : "left-1 bg-mute"
                    )}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function ModeCard({
  icon,
  title,
  blurb,
  detail,
  selected,
  ready,
  onSelect,
}: {
  icon: React.ReactNode;
  title: string;
  blurb: string;
  detail: string;
  selected: boolean;
  ready: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "flex flex-col gap-2 rounded-xl border p-4 text-left transition-colors",
        selected
          ? "border-chalk bg-line/30"
          : "border-line bg-ink hover:border-line-bright",
        !ready && !selected && "opacity-60"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          {icon}
          {title}
        </div>
        {selected ? (
          <span className="flex items-center gap-1 text-[11px] font-medium text-chalk">
            <Check className="size-3" />
            Active
          </span>
        ) : ready ? null : (
          <span className="text-[11px] text-mute-dim">Not connected</span>
        )}
      </div>
      <p className="text-xs leading-relaxed text-mute">{blurb}</p>
      <p className="text-xs leading-relaxed text-mute-dim">{detail}</p>
    </button>
  );
}
