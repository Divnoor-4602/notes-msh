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
});
