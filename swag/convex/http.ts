import { httpRouter } from "convex/server";
import { registerStaticRoutes } from "@convex-dev/static-hosting";
import { components, api } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { resend } from "./emails";
import type { Id } from "./_generated/dataModel";

const http = httpRouter();

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Reads the admin key from `Authorization: Bearer <key>`. */
function bearerKey(request: Request): string | null {
  const header = request.headers.get("Authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim() || null;
}

/**
 * Convex wraps thrown errors with a stack trace. Surface only the message so
 * an unauthenticated caller learns nothing about the backend.
 */
function unauthorized(error: unknown): Response {
  const message = error instanceof Error ? error.message : "";
  const isMisconfigured = message.includes("ADMIN_KEY is not set");
  return json(
    {
      error: isMisconfigured
        ? "ADMIN_KEY is not set on this deployment"
        : "Invalid admin key",
    },
    401
  );
}

/**
 * Outbox API for the Superhuman Mail MCP workflow.
 *
 * The Superhuman MCP server runs inside your AI client, not inside Convex, so
 * the assistant reads pending mail over HTTP, sends it with the send_draft
 * tool, then posts the ids back here. See SUPERHUMAN.md for the runbook.
 */
http.route({
  path: "/api/outbox/pending",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const key = bearerKey(request);
    if (!key) {
      return json({ error: "Missing Authorization: Bearer <ADMIN_KEY>" }, 401);
    }

    const url = new URL(request.url);
    const limitParam = url.searchParams.get("limit");
    const limit = limitParam ? Number(limitParam) : undefined;
    if (limit !== undefined && !Number.isFinite(limit)) {
      return json({ error: "limit must be a number" }, 400);
    }

    try {
      const emails = await ctx.runQuery(api.outbox.listPending, {
        key,
        limit,
      });
      return json({ count: emails.length, emails });
    } catch (error) {
      return unauthorized(error);
    }
  }),
});

http.route({
  path: "/api/outbox/sent",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const key = bearerKey(request);
    if (!key) {
      return json({ error: "Missing Authorization: Bearer <ADMIN_KEY>" }, 401);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Body must be JSON" }, 400);
    }

    const ids = (body as { ids?: unknown })?.ids;
    if (!Array.isArray(ids) || ids.some((id) => typeof id !== "string")) {
      return json({ error: "Body must be { ids: string[] }" }, 400);
    }

    try {
      const result = await ctx.runMutation(api.outbox.markSent, {
        key,
        ids: ids as Array<Id<"outbox">>,
        channel: "superhuman",
      });
      return json(result);
    } catch (error) {
      return unauthorized(error);
    }
  }),
});

/** Delivery events from Resend, only used when DELIVERY_MODE is "resend". */
http.route({
  path: "/api/resend-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    return await resend.handleResendEventWebhook(ctx, request);
  }),
});

// Catch-all. Exact routes above win, everything else serves the SPA.
registerStaticRoutes(http, components.staticHosting);

export default http;
