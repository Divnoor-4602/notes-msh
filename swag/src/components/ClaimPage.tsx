import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ClaimForm, type ClaimOutcome } from "./ClaimForm";
import { SuccessPanel } from "./SuccessPanel";

type View =
  | { kind: "form" }
  | { kind: "done"; outcome: ClaimOutcome }
  | { kind: "out_of_links" }
  | { kind: "closed" };

export function ClaimPage() {
  const settings = useQuery(api.settings.getPublic);
  const [view, setView] = useState<View>({ kind: "form" });

  const loading = settings === undefined;
  const unavailable =
    view.kind === "closed" ||
    view.kind === "out_of_links" ||
    (settings !== undefined &&
      view.kind === "form" &&
      (!settings.claimsOpen || !settings.linksAvailable));

  return (
    <main className="bg-halo flex min-h-dvh items-center justify-center px-5 py-14">
      <div className="w-full max-w-[440px]">
        <div className="mb-9 flex flex-col gap-4">
          <div className="text-[11px] font-medium tracking-[0.18em] text-mute-dim uppercase">
            Friends of Convex
          </div>
          <h1 className="text-[34px] leading-[1.12] font-semibold tracking-[-0.02em]">
            Thank you for being
            <br />a friend of Convex
          </h1>
          <p className="text-[15px] leading-relaxed text-mute">
            You have been around for the builds, the demos, and the late night
            threads. Drop your details and we will send you a link for some
            swag, on us.
          </p>
        </div>

        <div className="rounded-2xl border border-line bg-ink-soft/60 p-6 backdrop-blur-sm sm:p-7">
          {loading ? (
            <FormSkeleton />
          ) : unavailable ? (
            <ClosedPanel
              closed={view.kind === "closed" || !settings.claimsOpen}
            />
          ) : view.kind === "done" ? (
            <SuccessPanel outcome={view.outcome} />
          ) : (
            <ClaimForm
              onClaimed={(outcome) => setView({ kind: "done", outcome })}
              onOutOfLinks={() => setView({ kind: "out_of_links" })}
              onClosed={() => setView({ kind: "closed" })}
            />
          )}
        </div>

        <p className="mt-6 text-center text-xs text-mute-dim">
          One link per person. Built on Convex.
        </p>
      </div>
    </main>
  );
}

function ClosedPanel({ closed }: { closed: boolean }) {
  return (
    <div className="animate-rise flex flex-col gap-3 py-2">
      <h2 className="text-xl font-semibold tracking-tight">
        {closed ? "Claims are closed" : "Every link is spoken for"}
      </h2>
      <p className="text-[15px] leading-relaxed text-mute">
        {closed
          ? "This round has wrapped up. Keep an eye on the group chat for the next one."
          : "That was fast. All the swag has been claimed, but more may open up soon."}
      </p>
    </div>
  );
}

function FormSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-5" aria-hidden="true">
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex flex-col gap-2">
          <div className="h-3 w-20 rounded bg-line" />
          <div className="h-12 rounded-xl bg-line/60" />
        </div>
      ))}
      <div className="mt-1 h-12 rounded-xl bg-line" />
    </div>
  );
}
