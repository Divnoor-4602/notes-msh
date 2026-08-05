import { v } from "convex/values";
import { Resend, vOnEmailEventArgs, type EmailId } from "@convex-dev/resend";
import { components, internal } from "./_generated/api";
import { internalMutation, mutation, query } from "./_generated/server";
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

/** How long to wait between checks on an email Resend has not resolved yet. */
const RECONCILE_DELAY_MS = 60_000;
const MAX_RECONCILE_ATTEMPTS = 6;

/**
 * Hands one queued outbox row to Resend.
 *
 * `sendEmail` only enqueues into the component's workpool, so a successful
 * call means "accepted for sending", not "delivered". The row stays in
 * "sending" until either the webhook or reconcileResend learns its fate.
 */
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
        channel: "resend",
        resendEmailId: emailId,
        error: undefined,
      });

      await ctx.scheduler.runAfter(
        RECONCILE_DELAY_MS,
        internal.emails.reconcileResend,
        { outboxId: args.outboxId, attempt: 1 }
      );
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
 * Asks the Resend component what happened to an email.
 *
 * The webhook is faster, and this exists so the dashboard still tells the
 * truth on a deployment where no webhook is configured.
 */
export const reconcileResend = internalMutation({
  args: {
    outboxId: v.id("outbox"),
    attempt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.outboxId);
    if (!row || row.status !== "sending" || !row.resendEmailId) {
      return null;
    }

    const status = await resend.status(ctx, row.resendEmailId as EmailId);
    if (!status) return null;

    if (status.status === "delivered") {
      await ctx.db.patch(args.outboxId, {
        status: "sent",
        sentAt: Date.now(),
        error: undefined,
      });
      return null;
    }

    // The component reports a terminal failure through `status.status` and
    // does not always set the matching boolean, so check both.
    const terminalFailure =
      status.failed ||
      status.bounced ||
      status.status === "failed" ||
      status.status === "bounced" ||
      status.status === "cancelled";

    if (terminalFailure) {
      await ctx.db.patch(args.outboxId, {
        status: "failed",
        error: status.errorMessage ?? status.status,
      });
      return null;
    }

    // "sent" means Resend accepted it but delivery is unconfirmed. Give it a
    // few more checks, then leave it alone rather than guessing.
    if (args.attempt >= MAX_RECONCILE_ATTEMPTS) {
      if (status.status === "sent") {
        await ctx.db.patch(args.outboxId, {
          status: "sent",
          sentAt: Date.now(),
        });
      }
      return null;
    }

    await ctx.scheduler.runAfter(
      RECONCILE_DELAY_MS,
      internal.emails.reconcileResend,
      { outboxId: args.outboxId, attempt: args.attempt + 1 }
    );
    return null;
  },
});

/**
 * Resend delivery webhook, the fast path for learning an email's fate.
 * Bounces and complaints land in the failed list so they can be retried or
 * sent by hand.
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
      return null;
    }

    if (args.event.type === "email.delivered") {
      await ctx.db.patch(row._id, {
        status: "sent",
        sentAt: Date.now(),
        error: undefined,
      });
    }
    return null;
  },
});

/**
 * What Resend currently thinks of one email. Surfaced in the dashboard so a
 * row stuck in "sending" can be explained rather than guessed at.
 */
export const resendStatus = query({
  args: {
    key: v.string(),
    outboxId: v.id("outbox"),
  },
  returns: v.union(
    v.null(),
    v.object({
      status: v.string(),
      errorMessage: v.union(v.string(), v.null()),
      bounced: v.boolean(),
      complained: v.boolean(),
      failed: v.boolean(),
    })
  ),
  handler: async (ctx, args) => {
    requireAdmin(args.key);

    const row = await ctx.db.get(args.outboxId);
    if (!row?.resendEmailId) return null;

    const status = await resend.status(ctx, row.resendEmailId as EmailId);
    if (!status) return null;

    return {
      status: status.status,
      errorMessage: status.errorMessage,
      bounced: status.bounced,
      complained: status.complained,
      failed: status.failed,
    };
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
