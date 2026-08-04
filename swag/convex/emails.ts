import { v } from "convex/values";
import { Resend, vOnEmailEventArgs } from "@convex-dev/resend";
import { components, internal } from "./_generated/api";
import { internalMutation, mutation } from "./_generated/server";
import { requireAdmin } from "./lib/admin";
import { fromAddress, replyToAddresses } from "./lib/env";

/**
 * testMode is off because the whole point is mailing real people. Resend will
 * refuse to send until RESEND_API_KEY is set on the deployment.
 */
export const resend: Resend = new Resend(components.resend, {
  testMode: false,
  onEmailEvent: internal.emails.handleEmailEvent,
});

/** Sends one queued outbox row through Resend. */
export const deliverViaResend = internalMutation({
  args: { outboxId: v.id("outbox") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.outboxId);
    if (!row) {
      throw new Error("Outbox row not found");
    }
    // Guards against a retry double-sending the same link.
    if (row.status === "sent" || row.status === "sending") {
      return null;
    }

    await ctx.db.patch(args.outboxId, { status: "sending" });

    try {
      const emailId = await resend.sendEmail(ctx, {
        from: fromAddress(),
        to: row.to,
        subject: row.subject,
        html: row.html,
        text: row.text,
        replyTo: replyToAddresses(),
      });

      await ctx.db.patch(args.outboxId, {
        status: "sent",
        channel: "resend",
        resendEmailId: emailId,
        sentAt: Date.now(),
        error: undefined,
      });
    } catch (error) {
      await ctx.db.patch(args.outboxId, {
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown send error",
      });
      throw error;
    }
    return null;
  },
});

/**
 * Resend delivery webhook. Bounces and complaints flip the row back to failed
 * so it shows up in the admin table and can be retried or sent by hand.
 */
export const handleEmailEvent = internalMutation({
  args: vOnEmailEventArgs,
  returns: v.null(),
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("outbox")
      .withIndex("by_resendEmailId", (q) => q.eq("resendEmailId", args.id))
      .first();
    if (!row) return null;

    const failureEvents = ["email.bounced", "email.complained", "email.failed"];
    if (failureEvents.includes(args.event.type)) {
      await ctx.db.patch(row._id, {
        status: "failed",
        error: args.event.type,
      });
    }
    return null;
  },
});

/** Retries a failed row through Resend from the admin dashboard. */
export const retry = mutation({
  args: {
    key: v.string(),
    outboxId: v.id("outbox"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    requireAdmin(args.key);
    const row = await ctx.db.get(args.outboxId);
    if (!row) {
      throw new Error("Outbox row not found");
    }
    await ctx.db.patch(args.outboxId, { status: "pending", error: undefined });
    await ctx.scheduler.runAfter(0, internal.emails.deliverViaResend, {
      outboxId: args.outboxId,
    });
    return null;
  },
});
