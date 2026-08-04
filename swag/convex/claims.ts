import { v } from "convex/values";
import { internal } from "./_generated/api";
import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { requireAdmin } from "./lib/admin";
import { validateClaimInput } from "./lib/validation";
import { renderSwagEmail } from "./lib/emailTemplate";
import { getBooleanSetting } from "./settings";
import { deliveryMode, senderName } from "./lib/env";

const vSubmitResult = v.union(
  v.object({
    status: v.literal("claimed"),
    linkUrl: v.union(v.string(), v.null()),
    emailQueued: v.boolean(),
  }),
  v.object({
    status: v.literal("already_claimed"),
    linkUrl: v.union(v.string(), v.null()),
  }),
  v.object({ status: v.literal("closed") }),
  v.object({ status: v.literal("out_of_links") })
);

/** Finds the existing claim for this person, by email or by X handle. */
async function findExistingClaim(
  ctx: MutationCtx,
  email: string,
  twitterHandle: string
): Promise<Doc<"claims"> | null> {
  const byEmail = await ctx.db
    .query("claims")
    .withIndex("by_email", (q) => q.eq("email", email))
    .first();
  if (byEmail) return byEmail;

  return await ctx.db
    .query("claims")
    .withIndex("by_twitterHandle", (q) => q.eq("twitterHandle", twitterHandle))
    .first();
}

/**
 * Assigns one giveaway link and queues the email.
 *
 * Convex mutations are serializable transactions, so two people submitting at
 * the same instant cannot be handed the same link: the second transaction
 * conflicts and retries against the updated link status.
 */
export const submit = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    twitterHandle: v.string(),
  },
  returns: vSubmitResult,
  handler: async (ctx, args) => {
    if (!(await getBooleanSetting(ctx, "claimsOpen"))) {
      return { status: "closed" as const };
    }

    const input = validateClaimInput(args);
    const reveal = await getBooleanSetting(ctx, "revealLinkOnClaim");

    // Re-submitting returns the original link rather than burning a second one.
    const existing = await findExistingClaim(
      ctx,
      input.email,
      input.twitterHandle
    );
    if (existing) {
      return {
        status: "already_claimed" as const,
        linkUrl: reveal ? existing.linkUrl : null,
      };
    }

    const link = await ctx.db
      .query("giveawayLinks")
      .withIndex("by_status", (q) => q.eq("status", "available"))
      .first();
    if (!link) {
      return { status: "out_of_links" as const };
    }

    const now = Date.now();
    const claimId: Id<"claims"> = await ctx.db.insert("claims", {
      name: input.name,
      twitterHandle: input.twitterHandle,
      twitterHandleRaw: input.twitterHandleRaw,
      email: input.email,
      linkId: link._id,
      linkUrl: link.url,
      createdAt: now,
    });

    await ctx.db.patch(link._id, {
      status: "assigned",
      assignedClaimId: claimId,
      assignedAt: now,
    });

    const rendered = renderSwagEmail({
      recipientName: input.name,
      linkUrl: link.url,
      senderName: senderName(),
    });

    const outboxId = await ctx.db.insert("outbox", {
      claimId,
      to: input.email,
      toName: input.name,
      twitterHandle: input.twitterHandle,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      linkUrl: link.url,
      status: "pending",
      createdAt: now,
    });

    // In superhuman mode the row is left pending for you to drain, so the mail
    // goes out from your own mailbox instead of a transactional sender.
    const autoSend = deliveryMode() === "resend";
    if (autoSend) {
      await ctx.scheduler.runAfter(0, internal.emails.deliverViaResend, {
        outboxId,
      });
    }

    return {
      status: "claimed" as const,
      linkUrl: reveal ? link.url : null,
      emailQueued: true,
    };
  },
});

const vAdminClaim = v.object({
  _id: v.id("claims"),
  _creationTime: v.number(),
  name: v.string(),
  email: v.string(),
  twitterHandle: v.string(),
  twitterHandleRaw: v.string(),
  linkUrl: v.string(),
  createdAt: v.number(),
  emailStatus: v.union(
    v.literal("pending"),
    v.literal("sending"),
    v.literal("sent"),
    v.literal("failed"),
    v.literal("unknown")
  ),
});

/** Most recent claims with their delivery status, for the admin table. */
export const listRecent = query({
  args: {
    key: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(vAdminClaim),
  handler: async (ctx, args) => {
    requireAdmin(args.key);
    const limit = Math.min(args.limit ?? 50, 200);

    const claims = await ctx.db
      .query("claims")
      .withIndex("by_createdAt")
      .order("desc")
      .take(limit);

    const rows = [];
    for (const claim of claims) {
      const outboxRow = await ctx.db
        .query("outbox")
        .withIndex("by_claimId", (q) => q.eq("claimId", claim._id))
        .first();
      rows.push({
        _id: claim._id,
        _creationTime: claim._creationTime,
        name: claim.name,
        email: claim.email,
        twitterHandle: claim.twitterHandle,
        twitterHandleRaw: claim.twitterHandleRaw,
        linkUrl: claim.linkUrl,
        createdAt: claim.createdAt,
        emailStatus: outboxRow?.status ?? ("unknown" as const),
      });
    }
    return rows;
  },
});
