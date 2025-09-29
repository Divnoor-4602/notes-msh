import {
  AuthFunctions,
  createClient,
  type GenericCtx,
} from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { components, internal } from "./_generated/api";
import { DataModel } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { betterAuth } from "better-auth";
import { v } from "convex/values";

const siteUrl = process.env.SITE_URL!;

const authFunctions: AuthFunctions = internal.auth;

// The component client has methods needed for integrating Convex with Better Auth,
// as well as helper methods for general use.
export const authComponent = createClient<DataModel>(components.betterAuth, {
  authFunctions,
  verbose: true,
  triggers: {
    user: {
      onCreate: async (ctx, authUser) => {
        // Create a canvas for the new user
        await ctx.db.insert("canvas", {
          userId: authUser._id,
          elements: "[]",
          mermaidCode: "",
          lastModified: Date.now(),
        });
      },
      onUpdate: async (ctx, oldUser, newUser) => {
        console.log("User updated", newUser);
      },
      onDelete: async (ctx, authUser) => {
        console.log("User deleted", authUser);
      },
    },
  },
});

export const createAuth = (
  ctx: GenericCtx<DataModel>,
  { optionsOnly } = { optionsOnly: false }
) => {
  return betterAuth({
    // disable logging when createAuth is called just to generate options.
    // this is not required, but there's a lot of noise in logs without it.
    logger: {
      disabled: optionsOnly,
    },
    baseURL: siteUrl,
    database: authComponent.adapter(ctx),
    // Configure simple, non-verified email/password to get started
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    plugins: [
      // The Convex plugin is required for Convex compatibility
      convex(),
    ],
  });
};

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    try {
      return await authComponent.getAuthUser(ctx);
    } catch (error) {
      // Return null for unauthenticated users instead of throwing
      return null;
    }
  },
});

// Query to check if user is authenticated (returns boolean)
export const isAuthenticated = query({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    try {
      const user = await authComponent.getAuthUser(ctx);
      return user !== null;
    } catch (error) {
      // Return false for unauthenticated users instead of throwing
      return false;
    }
  },
});

export const { onCreate, onUpdate, onDelete } = authComponent.triggersApi();
