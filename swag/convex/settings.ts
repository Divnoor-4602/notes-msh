import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { requireAdmin } from "./lib/admin";
import {
  defaultDeliveryMode,
  fourthwallAuth,
  resendConfigured,
  type DeliveryMode,
} from "./lib/env";

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

const DELIVERY_MODE_KEY = "deliveryMode";

export const vDeliveryMode = v.union(
  v.literal("resend"),
  v.literal("superhuman")
);

/**
 * Which delivery path runs on submit. Stored in the database rather than an
 * environment variable so it can be switched from the dashboard mid event.
 */
export async function getDeliveryMode(ctx: QueryCtx): Promise<DeliveryMode> {
  const row = await ctx.db
    .query("config")
    .withIndex("by_key", (q) => q.eq("key", DELIVERY_MODE_KEY))
    .unique();

  return row?.stringValue === "resend"
    ? "resend"
    : row?.stringValue === "superhuman"
      ? "superhuman"
      : defaultDeliveryMode();
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

/**
 * Delivery mode plus whether each path is actually usable, so the dashboard
 * can explain why a mode is unavailable instead of failing at send time.
 */
export const getAdmin = query({
  args: { key: v.string() },
  returns: v.object({
    deliveryMode: vDeliveryMode,
    resendConfigured: v.boolean(),
    fourthwallConfigured: v.boolean(),
    senderName: v.string(),
    fromAddress: v.union(v.string(), v.null()),
  }),
  handler: async (ctx, args) => {
    requireAdmin(args.key);
    return {
      deliveryMode: await getDeliveryMode(ctx),
      resendConfigured: resendConfigured(),
      fourthwallConfigured: fourthwallAuth() !== null,
      senderName: process.env.SENDER_NAME ?? "The Convex team",
      fromAddress: process.env.EMAIL_FROM ?? null,
    };
  },
});

export const setDeliveryMode = mutation({
  args: {
    key: v.string(),
    mode: vDeliveryMode,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    requireAdmin(args.key);

    // Switching to Resend without credentials would silently queue mail that
    // never sends, so refuse it here where the dashboard can show why.
    if (args.mode === "resend" && !resendConfigured()) {
      throw new Error(
        "Set RESEND_API_KEY and EMAIL_FROM on this deployment before switching to Resend"
      );
    }

    const row = await ctx.db
      .query("config")
      .withIndex("by_key", (q) => q.eq("key", DELIVERY_MODE_KEY))
      .unique();

    if (row) {
      await ctx.db.patch(row._id, {
        stringValue: args.mode,
        updatedAt: Date.now(),
      });
      return null;
    }
    await ctx.db.insert("config", {
      key: DELIVERY_MODE_KEY,
      stringValue: args.mode,
      updatedAt: Date.now(),
    });
    return null;
  },
});
