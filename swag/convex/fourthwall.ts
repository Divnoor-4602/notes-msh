import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireAdmin } from "./lib/admin";
import { fourthwallAuth, type FourthwallAuth } from "./lib/env";

/**
 * Fourthwall Platform API, used to mint giveaway links straight into the pool
 * instead of exporting a CSV and importing it by hand.
 *
 * Docs: https://docs.fourthwall.com/api-reference/platform/giveaway-links
 * Credentials come from Settings, then For Developers, then the OpenAPI tab.
 */
const API_BASE = "https://api.fourthwall.com";

/** Fourthwall caps this endpoint at 100 requests per 10 seconds per shop. */
const MAX_LINKS_PER_CALL = 250;

function authHeader(auth: FourthwallAuth): string {
  if (auth.kind === "bearer") {
    return `Bearer ${auth.token}`;
  }
  return `Basic ${btoa(`${auth.username}:${auth.password}`)}`;
}

function requireFourthwall(): FourthwallAuth {
  const auth = fourthwallAuth();
  if (!auth) {
    throw new Error(
      "Fourthwall is not connected. Set FOURTHWALL_USERNAME and FOURTHWALL_PASSWORD on this deployment."
    );
  }
  return auth;
}

async function callFourthwall(
  auth: FourthwallAuth,
  path: string,
  init?: RequestInit
): Promise<unknown> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: authHeader(auth),
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    if (response.status === 401 || response.status === 403) {
      throw new Error(
        "Fourthwall rejected the credentials. Check FOURTHWALL_USERNAME and FOURTHWALL_PASSWORD."
      );
    }
    if (response.status === 429) {
      throw new Error("Fourthwall rate limited the request. Try again shortly.");
    }
    throw new Error(
      `Fourthwall returned ${response.status}: ${body.slice(0, 200)}`
    );
  }

  return await response.json();
}

const vProduct = v.object({
  id: v.string(),
  name: v.string(),
  imageUrl: v.union(v.string(), v.null()),
});

type ProductResponse = {
  results?: Array<{
    id?: unknown;
    name?: unknown;
    thumbnailImage?: { url?: unknown };
    images?: Array<{ url?: unknown }>;
  }>;
};

/** Products you can give away, for the picker in the admin dashboard. */
export const listProducts = action({
  args: {
    key: v.string(),
    search: v.optional(v.string()),
  },
  returns: v.array(vProduct),
  handler: async (_ctx, args) => {
    requireAdmin(args.key);
    const auth = requireFourthwall();

    const params = new URLSearchParams({ page: "0", size: "100" });
    if (args.search) {
      params.set("search", args.search);
    }

    const body = (await callFourthwall(
      auth,
      `/open-api/v1.0/products?${params.toString()}`
    )) as ProductResponse;

    const products = [];
    for (const result of body.results ?? []) {
      if (typeof result.id !== "string" || typeof result.name !== "string") {
        continue;
      }
      const thumbnail = result.thumbnailImage?.url ?? result.images?.[0]?.url;
      products.push({
        id: result.id,
        name: result.name,
        imageUrl: typeof thumbnail === "string" ? thumbnail : null,
      });
    }
    return products;
  },
});

type GiveawayLinksResponse = {
  packageId?: unknown;
  giveawayLinks?: Array<{ link?: unknown; status?: unknown }>;
};

type GenerateLinksResult = {
  packageId: string | null;
  generated: number;
  imported: number;
  duplicates: number;
};

/**
 * Creates giveaway links on Fourthwall and adds them to the pool in one step.
 *
 * Fourthwall charges your card on file for the product and shipping when
 * someone redeems a link, so this really does spend money.
 */
export const generateLinks = action({
  args: {
    key: v.string(),
    productId: v.string(),
    number: v.number(),
    batch: v.string(),
  },
  returns: v.object({
    packageId: v.union(v.string(), v.null()),
    generated: v.number(),
    imported: v.number(),
    duplicates: v.number(),
  }),
  // Annotated to break the circularity TypeScript sees through the generated
  // api types when an action calls back into a mutation.
  handler: async (ctx, args): Promise<GenerateLinksResult> => {
    requireAdmin(args.key);
    const auth = requireFourthwall();

    if (!Number.isInteger(args.number) || args.number < 1) {
      throw new Error("Number of links must be a whole number of at least 1");
    }
    if (args.number > MAX_LINKS_PER_CALL) {
      throw new Error(
        `Generate at most ${MAX_LINKS_PER_CALL} links at a time, got ${args.number}`
      );
    }

    const body = (await callFourthwall(auth, "/open-api/v1.0/giveaway-links", {
      method: "POST",
      body: JSON.stringify({
        productId: args.productId,
        number: args.number,
      }),
    })) as GiveawayLinksResponse;

    // Only unredeemed links are worth adding to the pool.
    const urls: Array<string> = [];
    for (const link of body.giveawayLinks ?? []) {
      if (typeof link.link !== "string") continue;
      if (link.status !== undefined && link.status !== "AVAILABLE") continue;
      urls.push(link.link);
    }

    if (urls.length === 0) {
      throw new Error("Fourthwall created the package but returned no links");
    }

    const result: { imported: number; duplicates: number } =
      await ctx.runMutation(internal.links.addGenerated, {
        urls,
        batch: args.batch.trim() || "fourthwall",
      });

    return {
      packageId: typeof body.packageId === "string" ? body.packageId : null,
      generated: urls.length,
      imported: result.imported,
      duplicates: result.duplicates,
    };
  },
});
