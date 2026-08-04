import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const vLinkStatus = v.union(
  v.literal("available"),
  v.literal("assigned")
);

export const vOutboxStatus = v.union(
  v.literal("pending"),
  v.literal("sending"),
  v.literal("sent"),
  v.literal("failed")
);

export const vChannel = v.union(
  v.literal("resend"),
  v.literal("superhuman"),
  v.literal("manual")
);

export default defineSchema({
  /**
   * One row per Fourthwall giveaway link. Links are single use, so a row moves
   * from "available" to "assigned" exactly once and is never reused.
   */
  giveawayLinks: defineTable({
    url: v.string(),
    // Trailing path segment of the URL. Used to reject duplicate imports.
    code: v.string(),
    // Free text label from the import, e.g. the CSV filename or campaign name.
    batch: v.string(),
    status: vLinkStatus,
    assignedClaimId: v.optional(v.id("claims")),
    assignedAt: v.optional(v.number()),
    importedAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_code", ["code"]),

  /** One row per person who filled out the form. */
  claims: defineTable({
    name: v.string(),
    // Lowercased, no leading "@". The raw input is kept in twitterHandleRaw.
    twitterHandle: v.string(),
    twitterHandleRaw: v.string(),
    // Lowercased and trimmed.
    email: v.string(),
    linkId: v.id("giveawayLinks"),
    linkUrl: v.string(),
    createdAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_twitterHandle", ["twitterHandle"])
    .index("by_createdAt", ["createdAt"]),

  /**
   * Every claim enqueues exactly one outbox row. This is the single source of
   * truth for delivery, drained either automatically by Resend or manually by
   * an assistant connected to the Superhuman Mail MCP server.
   */
  outbox: defineTable({
    claimId: v.id("claims"),
    to: v.string(),
    toName: v.string(),
    twitterHandle: v.string(),
    subject: v.string(),
    html: v.string(),
    text: v.string(),
    linkUrl: v.string(),
    status: vOutboxStatus,
    // Which path actually delivered it. Absent until sent.
    channel: v.optional(vChannel),
    resendEmailId: v.optional(v.string()),
    error: v.optional(v.string()),
    createdAt: v.number(),
    sentAt: v.optional(v.number()),
  })
    .index("by_status", ["status"])
    .index("by_claimId", ["claimId"])
    .index("by_resendEmailId", ["resendEmailId"])
    .index("by_status_and_createdAt", ["status", "createdAt"]),

  /** Single-row-per-key settings the admin can flip without a redeploy. */
  config: defineTable({
    key: v.string(),
    boolValue: v.optional(v.boolean()),
    stringValue: v.optional(v.string()),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),
});
