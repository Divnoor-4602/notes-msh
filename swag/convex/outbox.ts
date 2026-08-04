import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./lib/admin";
import { vChannel, vOutboxStatus } from "./schema";

/**
 * The outbox is the handoff point between this app and however you actually
 * send mail. Resend drains it automatically. The Superhuman Mail MCP server
 * drains it through you: your assistant reads pending rows, calls send_draft,
 * then marks them sent.
 */

const MAX_PENDING_PAGE = 50;

const vPendingEmail = v.object({
  id: v.id("outbox"),
  to: v.string(),
  toName: v.string(),
  twitterHandle: v.string(),
  subject: v.string(),
  html: v.string(),
  text: v.string(),
  linkUrl: v.string(),
  createdAt: v.number(),
});

/** Oldest pending emails first, so nobody waits longer than they have to. */
export const listPending = query({
  args: {
    key: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(vPendingEmail),
  handler: async (ctx, args) => {
    requireAdmin(args.key);
    const limit = Math.min(args.limit ?? 25, MAX_PENDING_PAGE);

    const rows = await ctx.db
      .query("outbox")
      .withIndex("by_status_and_createdAt", (q) => q.eq("status", "pending"))
      .order("asc")
      .take(limit);

    return rows.map((row) => ({
      id: row._id,
      to: row.to,
      toName: row.toName,
      twitterHandle: row.twitterHandle,
      subject: row.subject,
      html: row.html,
      text: row.text,
      linkUrl: row.linkUrl,
      createdAt: row.createdAt,
    }));
  },
});

const vOutboxRow = v.object({
  _id: v.id("outbox"),
  to: v.string(),
  toName: v.string(),
  subject: v.string(),
  linkUrl: v.string(),
  status: vOutboxStatus,
  channel: v.optional(vChannel),
  error: v.optional(v.string()),
  createdAt: v.number(),
  sentAt: v.optional(v.number()),
});

export const listByStatus = query({
  args: {
    key: v.string(),
    status: vOutboxStatus,
    limit: v.optional(v.number()),
  },
  returns: v.array(vOutboxRow),
  handler: async (ctx, args) => {
    requireAdmin(args.key);
    const limit = Math.min(args.limit ?? 25, MAX_PENDING_PAGE);

    const rows = await ctx.db
      .query("outbox")
      .withIndex("by_status_and_createdAt", (q) => q.eq("status", args.status))
      .order("desc")
      .take(limit);

    return rows.map((row) => ({
      _id: row._id,
      to: row.to,
      toName: row.toName,
      subject: row.subject,
      linkUrl: row.linkUrl,
      status: row.status,
      channel: row.channel,
      error: row.error,
      createdAt: row.createdAt,
      sentAt: row.sentAt,
    }));
  },
});

export const stats = query({
  args: { key: v.string() },
  returns: v.object({
    pending: v.number(),
    sending: v.number(),
    sent: v.number(),
    failed: v.number(),
  }),
  handler: async (ctx, args) => {
    requireAdmin(args.key);

    const countByStatus = async (
      status: "pending" | "sending" | "sent" | "failed"
    ) => {
      const rows = await ctx.db
        .query("outbox")
        .withIndex("by_status", (q) => q.eq("status", status))
        .take(1000);
      return rows.length;
    };

    return {
      pending: await countByStatus("pending"),
      sending: await countByStatus("sending"),
      sent: await countByStatus("sent"),
      failed: await countByStatus("failed"),
    };
  },
});

/**
 * Records that an email left your mailbox. Call this straight after the
 * Superhuman send_draft tool returns, so a rerun does not mail anyone twice.
 */
export const markSent = mutation({
  args: {
    key: v.string(),
    ids: v.array(v.id("outbox")),
    channel: v.optional(vChannel),
  },
  returns: v.object({ marked: v.number(), skipped: v.number() }),
  handler: async (ctx, args) => {
    requireAdmin(args.key);

    const now = Date.now();
    let marked = 0;
    let skipped = 0;

    for (const id of args.ids) {
      const row = await ctx.db.get(id);
      if (!row || row.status === "sent") {
        skipped++;
        continue;
      }
      await ctx.db.patch(id, {
        status: "sent",
        channel: args.channel ?? "superhuman",
        sentAt: now,
        error: undefined,
      });
      marked++;
    }

    return { marked, skipped };
  },
});

/** Puts a row back in the queue, for example after a send failed on your end. */
export const markPending = mutation({
  args: {
    key: v.string(),
    ids: v.array(v.id("outbox")),
  },
  returns: v.object({ marked: v.number() }),
  handler: async (ctx, args) => {
    requireAdmin(args.key);

    let marked = 0;
    for (const id of args.ids) {
      const row = await ctx.db.get(id);
      if (!row) continue;
      await ctx.db.patch(id, {
        status: "pending",
        error: undefined,
        sentAt: undefined,
        channel: undefined,
      });
      marked++;
    }
    return { marked };
  },
});
