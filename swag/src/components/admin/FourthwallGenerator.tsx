import { useState } from "react";
import { useAction, useQuery } from "convex/react";
import { RefreshCw, Sparkles } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Button } from "../ui/Button";
import { Field } from "../ui/Field";
import { Card } from "./Panel";
import { cn } from "@/lib/utils";

type Product = {
  id: string;
  name: string;
  imageUrl: string | null;
};

type GenerateResult = {
  packageId: string | null;
  generated: number;
  imported: number;
  duplicates: number;
};

/**
 * Mints giveaway links through the Fourthwall Platform API and drops them
 * straight into the pool, so there is no CSV round trip.
 */
export function FourthwallGenerator({ adminKey }: { adminKey: string }) {
  const admin = useQuery(api.settings.getAdmin, { key: adminKey });
  const listProducts = useAction(api.fourthwall.listProducts);
  const generateLinks = useAction(api.fourthwall.generateLinks);

  const [products, setProducts] = useState<Array<Product> | null>(null);
  const [productId, setProductId] = useState("");
  const [count, setCount] = useState("10");
  const [batch, setBatch] = useState("");
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (admin && !admin.fourthwallConfigured) {
    return (
      <Card
        title="Generate links from Fourthwall"
        description="Not connected. Create an API user in Fourthwall under Settings, then For Developers, then the OpenAPI tab."
      >
        <pre className="overflow-x-auto rounded-xl border border-line bg-ink p-4 font-mono text-[12px] leading-relaxed text-mute">
          {`npx convex env set FOURTHWALL_USERNAME "..."\nnpx convex env set FOURTHWALL_PASSWORD "..."`}
        </pre>
      </Card>
    );
  }

  async function loadProducts() {
    setLoadingProducts(true);
    setError(null);
    try {
      const found = await listProducts({ key: adminKey });
      setProducts(found);
      if (found.length > 0 && !productId) {
        setProductId(found[0].id);
      }
    } catch (caught) {
      setError(readableError(caught, "Could not load products"));
    } finally {
      setLoadingProducts(false);
    }
  }

  async function generate() {
    setGenerating(true);
    setError(null);
    setResult(null);
    try {
      setResult(
        await generateLinks({
          key: adminKey,
          productId,
          number: Number(count),
          batch,
        })
      );
    } catch (caught) {
      setError(readableError(caught, "Could not generate links"));
    } finally {
      setGenerating(false);
    }
  }

  const countValue = Number(count);
  const countValid = Number.isInteger(countValue) && countValue > 0;

  return (
    <Card
      title="Generate links from Fourthwall"
      description="Creates real giveaway links in your shop and adds them to the pool. Fourthwall charges your card for the product and shipping when someone redeems one."
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium tracking-wide text-mute">
              Product
            </span>
            <Button
              variant="ghost"
              size="sm"
              loading={loadingProducts}
              onClick={loadProducts}
            >
              <RefreshCw className="size-3.5" />
              {products ? "Refresh" : "Load products"}
            </Button>
          </div>

          {products === null ? (
            <div className="rounded-xl border border-dashed border-line py-6 text-center text-sm text-mute-dim">
              Load your products to pick one
            </div>
          ) : products.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line py-6 text-center text-sm text-mute-dim">
              No products found in this shop
            </div>
          ) : (
            <div className="flex max-h-64 flex-col gap-2 overflow-y-auto">
              {products.map((product) => (
                <button
                  key={product.id}
                  onClick={() => setProductId(product.id)}
                  aria-pressed={productId === product.id}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border p-3 text-left transition-colors",
                    productId === product.id
                      ? "border-chalk bg-line/30"
                      : "border-line bg-ink hover:border-line-bright"
                  )}
                >
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt=""
                      className="size-10 shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="size-10 shrink-0 rounded-lg bg-line" />
                  )}
                  <span className="min-w-0 truncate text-sm">
                    {product.name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="How many links"
            type="number"
            min={1}
            max={250}
            value={count}
            onChange={(event) => setCount(event.target.value)}
          />
          <Field
            label="Batch name"
            placeholder="fourthwall"
            value={batch}
            onChange={(event) => setBatch(event.target.value)}
          />
        </div>

        <Button
          size="sm"
          className="self-start"
          loading={generating}
          disabled={!productId || !countValid}
          onClick={generate}
        >
          <Sparkles className="size-3.5" />
          Generate {countValid ? countValue : ""} links
        </Button>

        {result ? (
          <p className="text-sm text-mute">
            Created {result.generated} links and added {result.imported} to the
            pool
            {result.duplicates > 0
              ? `, skipping ${result.duplicates} already there`
              : ""}
            .{result.packageId ? ` Package ${result.packageId}.` : ""}
          </p>
        ) : null}

        {error ? (
          <p role="alert" className="text-sm text-chalk">
            {error}
          </p>
        ) : null}
      </div>
    </Card>
  );
}

/** Convex wraps thrown errors, so pull out just the message we threw. */
function readableError(caught: unknown, fallback: string): string {
  if (!(caught instanceof Error)) return fallback;
  const match = caught.message.match(/Uncaught Error:\s*([^\n]+)/);
  return (match?.[1] ?? caught.message.split("\n")[0] ?? fallback).trim();
}
