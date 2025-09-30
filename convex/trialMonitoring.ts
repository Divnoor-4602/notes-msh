import { cronJobs } from "convex/server";
import { internalMutation } from "./_generated/server";
import { internal, components } from "./_generated/api";
import { v } from "convex/values";

// Cron job to check for trials ending soon (runs daily at 9 AM)
export const checkTrialsEndingSoon = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const now = Date.now();
    const oneDayFromNow = now + 24 * 60 * 60 * 1000; // 24 hours in milliseconds

    // Find users whose trials end in the next 24 hours
    const trialsEndingSoon = (
      await ctx.db
        .query("users")
        .withIndex("by_trial_end", (q) => q.eq("trialEndsAt", oneDayFromNow))
        .collect()
    ).filter((u) => u.subscriptionStatus === "trial");

    // Send emails to users whose trials are ending soon
    for (const user of trialsEndingSoon) {
      try {
        await ctx.runMutation(internal.email.sendTrialEndingSoonEmail, {
          userEmail: user.email,
          userName: user.name || "there",
          daysRemaining: 1,
        });
      } catch (error) {
        console.error(
          `Failed to send trial ending email to ${user.email}:`,
          error
        );
      }
    }

    return null;
  },
});

// Cron job to check for expired trials (runs daily at 9 AM)
export const checkExpiredTrials = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const now = Date.now();

    // Find users whose trials have expired
    const expiredTrials = (
      await ctx.db
        .query("users")
        .withIndex("by_trial_end", (q) => q.lt("trialEndsAt", now))
        .collect()
    ).filter((u) => u.subscriptionStatus === "trial");

    // Send emails to users whose trials have expired and update their status
    for (const user of expiredTrials) {
      try {
        await ctx.runMutation(internal.email.sendTrialExpiredEmail, {
          userEmail: user.email,
          userName: user.name || "there",
        });

        // Update user status to expired
        await ctx.db.patch(user._id, {
          subscriptionStatus: "expired",
        });
      } catch (error) {
        console.error(
          `Failed to send trial expired email to ${user.email}:`,
          error
        );
      }
    }

    return null;
  },
});

// Cron job to check for subscription activations (runs every hour)
export const checkSubscriptionActivations = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    // Find users who recently activated their subscription
    const recentActivations = (
      await ctx.db
        .query("users")
        .withIndex("by_subscription_status", (q) =>
          q.eq("subscriptionStatus", "active")
        )
        .collect()
    ).filter(
      (u) => (u.subscriptionActivatedAt ?? 0) > Date.now() - 60 * 60 * 1000
    );

    // Send welcome emails to newly activated subscribers
    for (const user of recentActivations) {
      try {
        await ctx.runMutation(internal.email.sendSubscriptionActivatedEmail, {
          userEmail: user.email,
          userName: user.name || "there",
          planName: user.subscriptionPlan || "Pro",
        });
      } catch (error) {
        console.error(
          `Failed to send subscription activated email to ${user.email}:`,
          error
        );
      }
    }

    return null;
  },
});

// Define the cron jobs
const crons = cronJobs();

// Run trial monitoring daily at 9 AM UTC
crons.cron(
  "check trials ending soon",
  "0 9 * * *",
  internal.trialMonitoring.checkTrialsEndingSoon,
  {}
);

crons.cron(
  "check expired trials",
  "5 9 * * *",
  internal.trialMonitoring.checkExpiredTrials,
  {}
);

// Run subscription activation check every hour
crons.interval(
  "check subscription activations",
  { hours: 1 },
  internal.trialMonitoring.checkSubscriptionActivations,
  {}
);

// Clean up old emails retained by the Resend component
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export const cleanupResend = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    await ctx.scheduler.runAfter(0, components.resend.lib.cleanupOldEmails, {
      olderThan: ONE_WEEK_MS,
    });
    await ctx.scheduler.runAfter(
      0,
      components.resend.lib.cleanupAbandonedEmails,
      { olderThan: 4 * ONE_WEEK_MS }
    );
    return null;
  },
});

crons.interval(
  "Remove old emails from the resend component",
  { hours: 1 },
  internal.trialMonitoring.cleanupResend,
  {}
);

export default crons;
