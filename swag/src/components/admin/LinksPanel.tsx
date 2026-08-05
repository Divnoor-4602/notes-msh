import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Upload } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Button } from "../ui/Button";
import { Field } from "../ui/Field";
import { Card, Stat, StatGrid } from "./Panel";
import { FourthwallGenerator } from "./FourthwallGenerator";

type ImportResult = {
  imported: number;
  duplicates: number;
  found: number;
};

/**
 * Fourthwall's giveaway page has an "Export links" button. Drop that CSV here,
 * or paste the links straight out of the spreadsheet. Re-importing the same
 * file is safe because links are deduped on their code.
 */
export function LinksPanel({ adminKey }: { adminKey: string }) {
  const stats = useQuery(api.links.stats, { key: adminKey });
  const importLinks = useMutation(api.links.importLinks);

  const [text, setText] = useState("");
  const [batch, setBatch] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setText(await file.text());
    if (!batch) setBatch(file.name.replace(/\.csv$/i, ""));
  }

  async function handleImport() {
    setImporting(true);
    setError(null);
    setResult(null);
    try {
      setResult(await importLinks({ key: adminKey, text, batch }));
      setText("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <StatGrid>
        <Stat label="Available" value={stats?.available ?? "-"} />
        <Stat label="Claimed" value={stats?.assigned ?? "-"} />
      </StatGrid>

      <FourthwallGenerator adminKey={adminKey} />

      <Card
        title="Or import links you already have"
        description="Upload the CSV that Fourthwall exports, or paste the column of links from your spreadsheet. Up to 500 at a time."
      >
        <div className="flex flex-col gap-4">
          <Field
            label="Batch name"
            placeholder="convex-friends-tees"
            value={batch}
            onChange={(event) => setBatch(event.target.value)}
          />

          <div className="flex flex-col gap-2">
            <label
              htmlFor="links-text"
              className="text-[13px] font-medium tracking-wide text-mute"
            >
              Links
            </label>
            <textarea
              id="links-text"
              rows={7}
              spellCheck={false}
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder={"https://yourshop.fourthwall.com/gift/abc123\nhttps://yourshop.fourthwall.com/gift/def456"}
              className="w-full resize-y rounded-xl border border-line bg-ink px-4 py-3 font-mono text-[13px] text-chalk transition-colors placeholder:text-mute-dim focus:border-mute focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-line-bright bg-ink-soft px-3 text-sm font-medium text-chalk transition-colors hover:border-mute">
              <Upload className="size-3.5" />
              Choose CSV
              <input
                type="file"
                accept=".csv,text/csv,text/plain"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void handleFile(file);
                }}
              />
            </label>

            <Button
              size="sm"
              loading={importing}
              disabled={text.trim().length === 0}
              onClick={handleImport}
            >
              Import links
            </Button>
          </div>

          {result ? (
            <p className="text-sm text-mute">
              Found {result.found}. Imported {result.imported}.{" "}
              {result.duplicates > 0
                ? `Skipped ${result.duplicates} already in the pool.`
                : ""}
            </p>
          ) : null}

          {error ? (
            <p role="alert" className="text-sm text-chalk">
              {error}
            </p>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
