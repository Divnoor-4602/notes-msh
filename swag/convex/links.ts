import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { requireAdmin } from "./lib/admin";
import { extractLinks, linkCode } from "./lib/validation";

/** Import batches are chunked by the client to stay well inside limits. */
export const MAX_LINKS_PER_IMPORT = 500;

/** How many rows the stats query will scan before it reports a capped count. */
const STATS_SCAN_LIMIT = 10000;

/**
 * Adds links to the pool, skipping any whose code is already present.
 * Shared by the paste and CSV import and by the Fourthwall API generator.
 */
async function addLinks(
  ctx: MutationCtx,
  urls: Array<string>,
  batch: string
): Promise<{ imported: number; duplicates: number }> {
  if (urls.length > MAX_LINKS_PER_IMPORT) {
    throw new Error(
      `Import at most ${MAX_LINKS_PER_IMPORT} links at a time, got ${urls.length}`
    );
  }

  const label = batch.trim() || "untitled";
  const now = Date.now();
  let imported = 0;
  let duplicates = 0;

  for (const url of urls) {
    const code = linkCode(url);
    const existing = await ctx.db
      .query("giveawayLinks")
      .withIndex("by_code", (q) => q.eq("code", code))
      .first();
    if (existing) {
      duplicates++;
      continue;
    }
    await ctx.db.insert("giveawayLinks", {
      url,
      code,
      batch: label,
      status: "available",
      importedAt: now,
    });
    imported++;
  }

  return { imported, duplicates };
}

/**
 * Imports Fourthwall giveaway links from a pasted CSV export or a plain list.
 * Links already present are skipped, so re-importing the same export is safe.
 */
export const importLinks = mutation({
  args: {
    key: v.string(),
    text: v.string(),
    batch: v.string(),
  },
  returns: v.object({
    imported: v.number(),
    duplicates: v.number(),
    found: v.number(),
  }),
  handler: async (ctx, args) => {
    requireAdmin(args.key);

    const urls = extractLinks(args.text);
    const result = await addLinks(ctx, urls, args.batch);
    return { ...result, found: urls.length };
  },
});

/** Used by the Fourthwall action, which already has real URLs in hand. */
export const addGenerated = internalMutation({
  args: {
    urls: v.array(v.string()),
    batch: v.string(),
  },
  returns: v.object({
    imported: v.number(),
    duplicates: v.number(),
  }),
  handler: async (ctx, args) => {
    return await addLinks(ctx, args.urls, args.batch);
  },
});

export const stats = query({
  args: { key: v.string() },
  returns: v.object({
    available: v.number(),
    assigned: v.number(),
    capped: v.boolean(),
  }),
  handler: async (ctx, args) => {
    requireAdmin(args.key);

    const available = await ctx.db
      .query("giveawayLinks")
      .withIndex("by_status", (q) => q.eq("status", "available"))
      .take(STATS_SCAN_LIMIT);
    const assigned = await ctx.db
      .query("giveawayLinks")
      .withIndex("by_status", (q) => q.eq("status", "assigned"))
      .take(STATS_SCAN_LIMIT);

    return {
      available: available.length,
      assigned: assigned.length,
      capped:
        available.length === STATS_SCAN_LIMIT ||
        assigned.length === STATS_SCAN_LIMIT,
    };
  },
});

/**
 * Deletes unclaimed links. Assigned links are never removed because a claim
 * row points at them.
 */
export const clearAvailable = mutation({
  args: { key: v.string() },
  returns: v.object({ deleted: v.number() }),
  handler: async (ctx, args) => {
    requireAdmin(args.key);

    const available = await ctx.db
      .query("giveawayLinks")
      .withIndex("by_status", (q) => q.eq("status", "available"))
      .take(MAX_LINKS_PER_IMPORT);

    for (const link of available) {
      await ctx.db.delete(link._id);
    }
    return { deleted: available.length };
  },
});
