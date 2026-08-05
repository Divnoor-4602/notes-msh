/**
 * Deployment configuration read from Convex environment variables.
 * Set these with `npx convex env set <NAME> <value>`.
 */

export type DeliveryMode = "resend" | "superhuman";

/**
 * Fallback delivery mode for a deployment that has never had the admin toggle
 * touched. The live value is stored in the database so it can be switched
 * without a redeploy. See settings.getDeliveryMode.
 */
export function defaultDeliveryMode(): DeliveryMode {
  return process.env.DELIVERY_MODE === "resend" ? "resend" : "superhuman";
}

/**
 * Resend refuses to send until both of these exist, so the admin dashboard
 * checks before letting you switch to automatic delivery.
 */
export function resendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
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

/**
 * Credentials for the Fourthwall Platform API.
 *
 * Create an API user under Settings, then For Developers, then the OpenAPI
 * tab. That gives a username and password used with HTTP Basic auth. A bearer
 * token is accepted too, for the OAuth flow used by multi-shop apps.
 */
export type FourthwallAuth =
  | { kind: "basic"; username: string; password: string }
  | { kind: "bearer"; token: string };

export function fourthwallAuth(): FourthwallAuth | null {
  const username = process.env.FOURTHWALL_USERNAME;
  const password = process.env.FOURTHWALL_PASSWORD;
  if (username && password) {
    return { kind: "basic", username, password };
  }

  const token = process.env.FOURTHWALL_TOKEN;
  if (token) {
    return { kind: "bearer", token };
  }
  return null;
}
