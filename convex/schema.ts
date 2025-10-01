import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  canvas: defineTable({
    elements: v.string(), // raw excalidraw elements
    mermaidCode: v.optional(v.string()), // latest mermaid code
    userId: v.string(), // better auth user id
    lastModified: v.number(), // timestamp when canvas was last modified
  }).index("by_user", ["userId"]),

  users: defineTable({
    email: v.string(),
    name: v.optional(v.string()),
    subscriptionStatus: v.union(
      v.literal("trial"),
      v.literal("active"),
      v.literal("expired"),
      v.literal("cancelled")
    ),
    trialEndsAt: v.optional(v.number()), // timestamp when trial ends
    subscriptionActivatedAt: v.optional(v.number()), // timestamp when subscription was activated
    subscriptionPlan: v.optional(v.string()), // plan name (e.g., "Pro", "Enterprise")
    autumnCustomerId: v.optional(v.string()), // Autumn customer ID
  })
    .index("by_email", ["email"])
    .index("by_subscription_status", ["subscriptionStatus"])
    .index("by_trial_end", ["trialEndsAt"]),

  sharedCanvases: defineTable({
    shareToken: v.string(), // unique token for sharing
    originalCanvasId: v.id("canvas"), // reference to original canvas
    sharedByUserId: v.string(), // user who created the share
    sharedByUserName: v.optional(v.string()), // name of user who shared
    sharedByUserEmail: v.optional(v.string()), // email of user who shared
    elements: v.string(), // snapshot of canvas elements at share time
    mermaidCode: v.optional(v.string()), // snapshot of mermaid code at share time
    expiresAt: v.optional(v.number()), // timestamp when share expires (optional)
    isPublic: v.boolean(), // whether share is public or invite-only
    accessCount: v.number(), // number of times canvas has been accessed/imported
    createdAt: v.number(), // timestamp when share was created
  })
    .index("by_shareToken", ["shareToken"])
    .index("by_sharedByUserId", ["sharedByUserId"])
    .index("by_expiresAt", ["expiresAt"]),
});
