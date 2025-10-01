import { v } from "convex/values";
import { mutation, query, action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { authComponent } from "./auth";

/**
 * Generate a unique share token using crypto.randomUUID()
 */
function generateShareToken(): string {
  return crypto.randomUUID();
}

/**
 * Create a shareable link for a canvas (Internal).
 * Takes a snapshot of the canvas at the time of sharing.
 */
export const createShareLink = internalMutation({
  args: {
    canvasId: v.id("canvas"),
    expiresInDays: v.optional(v.number()),
    userName: v.optional(v.string()),
    userEmail: v.optional(v.string()),
  },
  returns: v.object({
    shareToken: v.string(),
    shareUrl: v.string(),
    shareId: v.id("sharedCanvases"),
  }),
  handler: async (ctx, args) => {
    // Get canvas data
    const canvas = await ctx.db.get(args.canvasId);
    if (!canvas) {
      throw new Error("Canvas not found");
    }

    // Generate unique token
    const shareToken = generateShareToken();

    // Calculate expiration timestamp if provided
    const expiresAt = args.expiresInDays
      ? Date.now() + args.expiresInDays * 24 * 60 * 60 * 1000
      : undefined;

    // Create share record (snapshot of canvas at this moment)
    const shareId = await ctx.db.insert("sharedCanvases", {
      shareToken,
      originalCanvasId: args.canvasId,
      sharedByUserId: canvas.userId,
      sharedByUserName: args.userName,
      sharedByUserEmail: args.userEmail,
      elements: canvas.elements, // Snapshot of elements
      mermaidCode: canvas.mermaidCode, // Snapshot of mermaid code
      expiresAt,
      isPublic: true,
      accessCount: 0,
      createdAt: Date.now(),
    });

    // Build share URL
    const siteUrl = process.env.SITE_URL || "http://localhost:3000";
    const shareUrl = `${siteUrl}?token=${shareToken}`;

    return {
      shareToken,
      shareUrl,
      shareId,
    };
  },
});

/**
 * Create a shareable link for a canvas (Public API).
 * This is the public wrapper that calls the internal function.
 */
export const createShareLinkPublic = mutation({
  args: {
    canvasId: v.id("canvas"),
    expiresInDays: v.optional(v.number()),
  },
  returns: v.object({
    shareToken: v.string(),
    shareUrl: v.string(),
    shareId: v.id("sharedCanvases"),
  }),
  handler: async (ctx, args) => {
    // Get current user info
    let userName: string | undefined;
    let userEmail: string | undefined;

    try {
      const authUser = await authComponent.getAuthUser(ctx);
      if (authUser) {
        userName = (authUser as any).name;
        userEmail = (authUser as any).email;
      }
    } catch (error) {
      console.error("Failed to get current user:", error);
    }

    const result: {
      shareToken: string;
      shareUrl: string;
      shareId: Id<"sharedCanvases">;
    } = await ctx.runMutation(internal.sharing.createShareLink, {
      canvasId: args.canvasId,
      expiresInDays: args.expiresInDays,
      userName,
      userEmail,
    });
    return result;
  },
});

/**
 * Get shared canvas data by share token.
 * Used to preview the canvas before importing.
 */
export const getSharedCanvas = query({
  args: {
    shareToken: v.string(),
  },
  returns: v.union(
    v.object({
      _id: v.id("sharedCanvases"),
      elements: v.string(),
      mermaidCode: v.optional(v.string()),
      sharedByUserName: v.optional(v.string()),
      sharedByUserEmail: v.optional(v.string()),
      expiresAt: v.optional(v.number()),
      accessCount: v.number(),
      createdAt: v.number(),
      isExpired: v.boolean(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    // Find shared canvas by token
    const shared = await ctx.db
      .query("sharedCanvases")
      .withIndex("by_shareToken", (q) => q.eq("shareToken", args.shareToken))
      .first();

    if (!shared) {
      return null;
    }

    // Check if expired
    const isExpired = shared.expiresAt ? shared.expiresAt < Date.now() : false;

    return {
      _id: shared._id,
      elements: shared.elements,
      mermaidCode: shared.mermaidCode,
      sharedByUserName: shared.sharedByUserName,
      sharedByUserEmail: shared.sharedByUserEmail,
      expiresAt: shared.expiresAt,
      accessCount: shared.accessCount,
      createdAt: shared.createdAt,
      isExpired,
    };
  },
});

/**
 * Import a shared canvas into the current user's canvas.
 * Supports replace or merge modes.
 */
export const importSharedCanvas = mutation({
  args: {
    shareToken: v.string(),
    userId: v.string(),
    importOption: v.optional(v.union(v.literal("replace"), v.literal("merge"))),
  },
  returns: v.object({
    success: v.boolean(),
    canvasId: v.id("canvas"),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    // Find shared canvas by token
    const shared = await ctx.db
      .query("sharedCanvases")
      .withIndex("by_shareToken", (q) => q.eq("shareToken", args.shareToken))
      .first();

    if (!shared) {
      throw new Error("Share link not found");
    }

    // Check if expired
    if (shared.expiresAt && shared.expiresAt < Date.now()) {
      throw new Error("This share link has expired");
    }

    // Get user's existing canvas
    const existingCanvas = await ctx.db
      .query("canvas")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();

    const importOption = args.importOption || "replace";
    let canvasId: Id<"canvas">;
    let message: string;

    if (importOption === "replace" && existingCanvas) {
      // Replace existing canvas with shared canvas
      await ctx.db.patch(existingCanvas._id, {
        elements: shared.elements,
        mermaidCode: shared.mermaidCode,
        lastModified: Date.now(),
      });
      canvasId = existingCanvas._id;
      message = "Canvas replaced successfully!";
    } else if (importOption === "merge" && existingCanvas) {
      // Merge shared elements with existing canvas
      const existingElements = JSON.parse(existingCanvas.elements);
      const sharedElements = JSON.parse(shared.elements);

      // Offset shared elements to avoid overlap
      const offsetSharedElements = sharedElements.map((el: any) => ({
        ...el,
        x: (el.x || 0) + 600, // Shift right
        y: (el.y || 0) + 100, // Shift down
        id: crypto.randomUUID(), // Generate new IDs to avoid conflicts
      }));

      const mergedElements = [...existingElements, ...offsetSharedElements];

      await ctx.db.patch(existingCanvas._id, {
        elements: JSON.stringify(mergedElements),
        lastModified: Date.now(),
      });
      canvasId = existingCanvas._id;
      message = "Canvas elements merged successfully!";
    } else {
      // Create new canvas with shared data
      canvasId = await ctx.db.insert("canvas", {
        userId: args.userId,
        elements: shared.elements,
        mermaidCode: shared.mermaidCode,
        lastModified: Date.now(),
      });
      message = "Canvas imported successfully!";
    }

    // Increment access count
    await ctx.db.patch(shared._id, {
      accessCount: shared.accessCount + 1,
    });

    return {
      success: true,
      canvasId,
      message,
    };
  },
});

/**
 * Share a canvas via email.
 * Creates a share link and sends emails to recipients.
 */
export const shareCanvasViaEmail = action({
  args: {
    canvasId: v.id("canvas"),
    recipientEmails: v.array(v.string()),
    customMessage: v.optional(v.string()),
    expiresInDays: v.optional(v.number()),
    userName: v.optional(v.string()),
    userEmail: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    shareUrl: v.string(),
  }),
  handler: async (ctx, args) => {
    // Create share link first
    const result: {
      shareToken: string;
      shareUrl: string;
      shareId: Id<"sharedCanvases">;
    } = await ctx.runMutation(internal.sharing.createShareLink, {
      canvasId: args.canvasId,
      expiresInDays: args.expiresInDays || 30,
      userName: args.userName,
      userEmail: args.userEmail,
    });

    // Send email to each recipient
    const senderName = args.userName || "Notes0 User";
    for (const recipientEmail of args.recipientEmails) {
      await ctx.runMutation(internal.email.sendCanvasShareEmail, {
        recipientEmail,
        senderName,
        shareUrl: result.shareUrl,
        customMessage: args.customMessage,
      });
    }

    return {
      success: true,
      shareUrl: result.shareUrl,
    };
  },
});

/**
 * List all shares created by the current user.
 * Useful for managing and revoking shares.
 */
export const listMyShares = query({
  args: {
    userId: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id("sharedCanvases"),
      shareToken: v.string(),
      createdAt: v.number(),
      expiresAt: v.optional(v.number()),
      accessCount: v.number(),
      isExpired: v.boolean(),
    })
  ),
  handler: async (ctx, args) => {
    const shares = await ctx.db
      .query("sharedCanvases")
      .withIndex("by_sharedByUserId", (q) =>
        q.eq("sharedByUserId", args.userId)
      )
      .collect();

    return shares.map((share) => ({
      _id: share._id,
      shareToken: share.shareToken,
      createdAt: share.createdAt,
      expiresAt: share.expiresAt,
      accessCount: share.accessCount,
      isExpired: share.expiresAt ? share.expiresAt < Date.now() : false,
    }));
  },
});

/**
 * Revoke a share link.
 * Deletes the share record so it can no longer be accessed.
 */
export const revokeShare = mutation({
  args: {
    shareId: v.id("sharedCanvases"),
    userId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Get share to verify ownership
    const share = await ctx.db.get(args.shareId);

    if (!share) {
      throw new Error("Share not found");
    }

    // Verify that the user owns this share
    if (share.sharedByUserId !== args.userId) {
      throw new Error("You don't have permission to revoke this share");
    }

    // Delete the share
    await ctx.db.delete(args.shareId);

    return null;
  },
});
