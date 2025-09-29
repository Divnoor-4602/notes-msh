import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  canvas: defineTable({
    elements: v.string(), // raw excalidraw elements
    mermaidCode: v.optional(v.string()), // latest mermaid code
    userId: v.string(), // better auth user id
    lastModified: v.number(), // timestamp when canvas was last modified
  }).index("by_user", ["userId"]),
});
