import { useState, type FormEvent } from "react";
import { useMutation } from "convex/react";
import { AlertCircle } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { Button } from "./ui/Button";
import { Field } from "./ui/Field";

export type ClaimOutcome =
  | { status: "claimed"; linkUrl: string | null; emailQueued: boolean }
  | { status: "already_claimed"; linkUrl: string | null };

type ClaimFormProps = {
  onClaimed: (outcome: ClaimOutcome) => void;
  onOutOfLinks: () => void;
  onClosed: () => void;
};

export function ClaimForm({
  onClaimed,
  onOutOfLinks,
  onClosed,
}: ClaimFormProps) {
  const submit = useMutation(api.claims.submit);

  const [name, setName] = useState("");
  const [twitterHandle, setTwitterHandle] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const result = await submit({ name, email, twitterHandle });

      switch (result.status) {
        case "claimed":
        case "already_claimed":
          onClaimed(result);
          break;
        case "invalid":
          setError(result.message);
          break;
        case "out_of_links":
          onOutOfLinks();
          break;
        case "closed":
          onClosed();
          break;
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      <Field
        label="Your name"
        placeholder="Ada Lovelace"
        autoComplete="name"
        required
        value={name}
        onChange={(event) => setName(event.target.value)}
      />

      <Field
        label="X handle"
        prefix="@"
        placeholder="adalovelace"
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        required
        value={twitterHandle}
        onChange={(event) => setTwitterHandle(event.target.value)}
      />

      <Field
        label="Email"
        type="email"
        placeholder="ada@example.com"
        autoComplete="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        hint="Your link is sent here. Nothing else, no list, no newsletter."
      />

      {error ? (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-lg border border-line-bright bg-ink-soft px-3.5 py-3 text-sm text-chalk"
        >
          <AlertCircle className="mt-px size-4 shrink-0 text-mute" />
          <span>{error}</span>
        </div>
      ) : null}

      <Button type="submit" loading={submitting} className="mt-1 w-full">
        {submitting ? "Sending" : "Send my link"}
      </Button>
    </form>
  );
}
