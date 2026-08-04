import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { requireAdmin } from "./lib/admin";

/** Settings the admin can flip at runtime, with their defaults. */
const BOOLEAN_DEFAULTS = {
  // Master switch for the public form.
  claimsOpen: true,
  // Show the link on the confirmation screen as well as emailing it.
  // Turn this off to make email the only way to receive a link.
  revealLinkOnClaim: true,
} as const;

export type BooleanSettingKey = keyof typeof BOOLEAN_DEFAULTS;

const vBooleanSettingKey = v.union(
  v.literal("claimsOpen"),
  v.literal("revealLinkOnClaim")
);

export async function getBooleanSetting(
  ctx: QueryCtx,
  key: BooleanSettingKey
): Promise<boolean> {
  const row = await ctx.db
    .query("config")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique();
  return row?.boolValue ?? BOOLEAN_DEFAULTS[key];
}

export async function setBooleanSetting(
  ctx: MutationCtx,
  key: BooleanSettingKey,
  value: boolean
): Promise<void> {
  const row = await ctx.db
    .query("config")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique();
  if (row) {
    await ctx.db.patch(row._id, { boolValue: value, updatedAt: Date.now() });
    return;
  }
  await ctx.db.insert("config", {
    key,
    boolValue: value,
    updatedAt: Date.now(),
  });
}

/**
 * Everything the public form needs to render. Intentionally does not expose
 * how many links are left, only whether any remain.
 */
export const getPublic = query({
  args: {},
  returns: v.object({
    claimsOpen: v.boolean(),
    revealLinkOnClaim: v.boolean(),
    linksAvailable: v.boolean(),
  }),
  handler: async (ctx) => {
    const nextLink = await ctx.db
      .query("giveawayLinks")
      .withIndex("by_status", (q) => q.eq("status", "available"))
      .first();

    return {
      claimsOpen: await getBooleanSetting(ctx, "claimsOpen"),
      revealLinkOnClaim: await getBooleanSetting(ctx, "revealLinkOnClaim"),
      linksAvailable: nextLink !== null,
    };
  },
});

export const setBoolean = mutation({
  args: {
    key: v.string(),
    settingKey: vBooleanSettingKey,
    value: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    requireAdmin(args.key);
    await setBooleanSetting(ctx, args.settingKey, args.value);
    return null;
  },
});
