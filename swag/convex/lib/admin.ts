/**
 * Admin access for this app is a shared secret, not a user session.
 *
 * The claim form is deliberately anonymous, so there is no auth provider to
 * hang `ctx.auth.getUserIdentity()` off of. Admin functions instead require the
 * ADMIN_KEY environment variable set on the Convex deployment. Anyone holding
 * that key is an admin, so treat it like a password and rotate it after an
 * event.
 */

/** Compares without leaking the position of the first mismatch via timing. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/** Throws unless `key` matches the deployment's ADMIN_KEY. */
export function requireAdmin(key: string): void {
  const expected = process.env.ADMIN_KEY;
  if (!expected) {
    throw new Error(
      "ADMIN_KEY is not set on this deployment. Run: npx convex env set ADMIN_KEY <value>"
    );
  }
  if (!timingSafeEqual(key, expected)) {
    throw new Error("Invalid admin key");
  }
}
