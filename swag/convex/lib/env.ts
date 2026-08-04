/**
 * Deployment configuration read from Convex environment variables.
 * Set these with `npx convex env set <NAME> <value>`.
 */

export type DeliveryMode = "resend" | "superhuman";

/**
 * How swag emails leave the building.
 *
 * - "superhuman" (default): claims queue up in the outbox and you drain them
 *   through the Superhuman Mail MCP server, so mail comes from your own
 *   mailbox in your own voice.
 * - "resend": the Convex Resend component sends immediately on submit.
 */
export function deliveryMode(): DeliveryMode {
  return process.env.DELIVERY_MODE === "resend" ? "resend" : "superhuman";
}

/** Signature at the bottom of the email. */
export function senderName(): string {
  return process.env.SENDER_NAME ?? "The Convex team";
}

/** Resend "from" header, for example: Ada <ada@example.com> */
export function fromAddress(): string {
  const from = process.env.EMAIL_FROM;
  if (!from) {
    throw new Error(
      "EMAIL_FROM is not set. Run: npx convex env set EMAIL_FROM 'You <you@yourdomain.com>'"
    );
  }
  return from;
}

/** Optional reply-to, so replies reach a human even in Resend mode. */
export function replyToAddresses(): Array<string> {
  const replyTo = process.env.EMAIL_REPLY_TO;
  return replyTo ? [replyTo] : [];
}
