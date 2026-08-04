import { useMutation, useQuery } from "convex/react";
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
  const setBoolean = useMutation(api.settings.setBoolean);

  return (
    <Card
      title="Settings"
      description="Saved to the database, so changes apply immediately with no redeploy."
    >
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
  );
}
