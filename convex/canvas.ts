import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// CREATE - Create a new canvas for a user
export const createCanvas = mutation({
  args: {
    userId: v.string(),
    elements: v.optional(v.string()),
    mermaidCode: v.optional(v.string()),
  },
  returns: v.id("canvas"),
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("canvas", {
      userId: args.userId,
      elements: args.elements || "[]",
      mermaidCode: args.mermaidCode,
      lastModified: now,
    });
  },
});

// READ - Get canvas by user ID
export const getCanvasByUserId = query({
  args: {
    userId: v.string(),
  },
  returns: v.union(
    v.object({
      _id: v.id("canvas"),
      elements: v.string(),
      mermaidCode: v.optional(v.string()),
      userId: v.string(),
      _creationTime: v.number(),
      lastModified: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const canvas = await ctx.db
      .query("canvas")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();

    return canvas;
  },
});

// READ - Get canvas by canvas ID
export const getCanvasById = query({
  args: {
    canvasId: v.id("canvas"),
  },
  returns: v.union(
    v.object({
      _id: v.id("canvas"),
      elements: v.string(),
      mermaidCode: v.optional(v.string()),
      userId: v.string(),
      _creationTime: v.number(),
      lastModified: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.canvasId);
  },
});

// UPDATE - Update canvas elements
export const updateCanvasElements = mutation({
  args: {
    canvasId: v.id("canvas"),
    elements: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.canvasId, {
      elements: args.elements,
      lastModified: Date.now(),
    });
    return null;
  },
});

// UPDATE - Update canvas mermaid code
export const updateCanvasMermaidCode = mutation({
  args: {
    canvasId: v.id("canvas"),
    mermaidCode: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.canvasId, {
      mermaidCode: args.mermaidCode,
      lastModified: Date.now(),
    });
    return null;
  },
});

// UPDATE - Update both elements and mermaid code
export const updateCanvas = mutation({
  args: {
    canvasId: v.id("canvas"),
    elements: v.optional(v.string()),
    mermaidCode: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    updatedFields: v.array(v.string()),
    elementCount: v.number(),
    hasMermaidCode: v.boolean(),
    lastModified: v.number(),
  }),
  handler: async (ctx, args) => {
    const updates: any = {
      lastModified: Date.now(),
    };

    const updatedFields: string[] = [];

    if (args.elements !== undefined) {
      updates.elements = args.elements;
      updatedFields.push("elements");
    }

    if (args.mermaidCode !== undefined) {
      updates.mermaidCode = args.mermaidCode;
      updatedFields.push("mermaidCode");
    }

    await ctx.db.patch(args.canvasId, updates);

    // Parse elements to get count
    let elementCount = 0;
    try {
      if (args.elements) {
        const parsedElements = JSON.parse(args.elements);
        elementCount = Array.isArray(parsedElements)
          ? parsedElements.length
          : 0;
      }
    } catch {
      elementCount = 0;
    }

    return {
      success: true,
      updatedFields,
      elementCount,
      hasMermaidCode: !!args.mermaidCode,
      lastModified: updates.lastModified,
    };
  },
});

// DELETE - Delete canvas by ID
export const deleteCanvas = mutation({
  args: {
    canvasId: v.id("canvas"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.canvasId);
    return null;
  },
});

// DELETE - Delete canvas by user ID
export const deleteCanvasByUserId = mutation({
  args: {
    userId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const canvas = await ctx.db
      .query("canvas")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();

    if (canvas) {
      await ctx.db.delete(canvas._id);
    }

    return null;
  },
});

// LIST - Get all canvases (for admin purposes)
export const listAllCanvases = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("canvas"),
      elements: v.string(),
      mermaidCode: v.optional(v.string()),
      userId: v.string(),
      _creationTime: v.number(),
      lastModified: v.number(),
    })
  ),
  handler: async (ctx) => {
    return await ctx.db.query("canvas").collect();
  },
});
