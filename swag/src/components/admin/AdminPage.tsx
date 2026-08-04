import { useEffect, useState, type FormEvent } from "react";
import { useConvex } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "../ui/Button";
import { Field } from "../ui/Field";
import { LinksPanel } from "./LinksPanel";
import { OutboxPanel } from "./OutboxPanel";
import { ClaimsPanel } from "./ClaimsPanel";
import { SettingsPanel } from "./SettingsPanel";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "swag-admin-key";

type Tab = "outbox" | "links" | "claims" | "settings";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "outbox", label: "Outbox" },
  { id: "links", label: "Links" },
  { id: "claims", label: "Claims" },
  { id: "settings", label: "Settings" },
];

export function AdminPage() {
  const [adminKey, setAdminKey] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("outbox");

  // Restore a key from a previous visit so a refresh does not lock you out.
  const convex = useConvex();
  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    convex
      .query(api.links.stats, { key: stored })
      .then(() => setAdminKey(stored))
      .catch(() => sessionStorage.removeItem(STORAGE_KEY));
  }, [convex]);

  if (!adminKey) {
    return <KeyGate onUnlock={setAdminKey} />;
  }

  return (
    <main className="min-h-dvh px-5 py-10">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        <header className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] font-medium tracking-[0.18em] text-mute-dim uppercase">
              Friends of Convex
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">
              Swag control room
            </h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              sessionStorage.removeItem(STORAGE_KEY);
              setAdminKey(null);
            }}
          >
            Lock
          </Button>
        </header>

        <nav className="flex gap-1 rounded-xl border border-line bg-ink-soft p-1">
          {TABS.map((entry) => (
            <button
              key={entry.id}
              onClick={() => setTab(entry.id)}
              className={cn(
                "flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                tab === entry.id
                  ? "bg-chalk text-ink"
                  : "text-mute hover:text-chalk"
              )}
            >
              {entry.label}
            </button>
          ))}
        </nav>

        {tab === "outbox" ? <OutboxPanel adminKey={adminKey} /> : null}
        {tab === "links" ? <LinksPanel adminKey={adminKey} /> : null}
        {tab === "claims" ? <ClaimsPanel adminKey={adminKey} /> : null}
        {tab === "settings" ? <SettingsPanel adminKey={adminKey} /> : null}
      </div>
    </main>
  );
}

function KeyGate({ onUnlock }: { onUnlock: (key: string) => void }) {
  const convex = useConvex();
  const [value, setValue] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setChecking(true);
    setError(null);
    try {
      // Any admin query works as a credential check.
      await convex.query(api.links.stats, { key: value });
      sessionStorage.setItem(STORAGE_KEY, value);
      onUnlock(value);
    } catch {
      setError("That key was not accepted");
    } finally {
      setChecking(false);
    }
  }

  return (
    <main className="bg-halo flex min-h-dvh items-center justify-center px-5">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl border border-line bg-ink-soft/60 p-7"
      >
        <h1 className="mb-1 text-xl font-semibold tracking-tight">
          Admin access
        </h1>
        <p className="mb-6 text-sm text-mute">
          Enter the ADMIN_KEY set on this Convex deployment.
        </p>

        <Field
          label="Admin key"
          type="password"
          autoComplete="current-password"
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />

        {error ? (
          <p role="alert" className="mt-3 text-sm text-chalk">
            {error}
          </p>
        ) : null}

        <Button type="submit" loading={checking} className="mt-5 w-full">
          Unlock
        </Button>
      </form>
    </main>
  );
}
