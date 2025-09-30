import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const sendTrialStartedEmailAction = action({
  args: {
    userEmail: v.string(),
    userName: v.string(),
    trialDays: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.email.sendTrialStartedEmail, {
      userEmail: args.userEmail,
      userName: args.userName,
      trialDays: args.trialDays,
    });
    return null;
  },
});

export const sendTrialEndingSoonEmailAction = action({
  args: {
    userEmail: v.string(),
    userName: v.string(),
    daysRemaining: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.email.sendTrialEndingSoonEmail, {
      userEmail: args.userEmail,
      userName: args.userName,
      daysRemaining: args.daysRemaining,
    });
    return null;
  },
});

export const sendTrialExpiredEmailAction = action({
  args: {
    userEmail: v.string(),
    userName: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.email.sendTrialExpiredEmail, {
      userEmail: args.userEmail,
      userName: args.userName,
    });
    return null;
  },
});

export const sendSubscriptionActivatedEmailAction = action({
  args: {
    userEmail: v.string(),
    userName: v.string(),
    planName: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.email.sendSubscriptionActivatedEmail, {
      userEmail: args.userEmail,
      userName: args.userName,
      planName: args.planName,
    });
    return null;
  },
});
