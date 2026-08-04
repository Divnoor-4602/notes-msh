/** Input normalization and validation shared by the form and the CSV import. */

export const MAX_NAME_LENGTH = 80;
export const MAX_HANDLE_LENGTH = 15;

// Deliberately permissive. Real validation is the recipient clicking the link
// in the inbox, so the goal here is only to catch obvious typos.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const HANDLE_PATTERN = /^[A-Za-z0-9_]{1,15}$/;

export function normalizeEmail(input: string): string {
  return input.trim().toLowerCase();
}

/** Strips a leading "@" or a full profile URL down to the bare handle. */
export function normalizeHandle(input: string): string {
  let handle = input.trim();
  handle = handle.replace(
    /^https?:\/\/(www\.)?(twitter|x)\.com\//i,
    ""
  );
  handle = handle.replace(/^@+/, "");
  handle = handle.split(/[/?#]/)[0];
  return handle.toLowerCase();
}

export function normalizeName(input: string): string {
  return input.trim().replace(/\s+/g, " ");
}

export type ValidatedClaimInput = {
  name: string;
  email: string;
  twitterHandle: string;
  twitterHandleRaw: string;
};

/**
 * Normalizes and validates form input.
 * Throws with a message intended to be shown directly to the person.
 */
export function validateClaimInput(raw: {
  name: string;
  email: string;
  twitterHandle: string;
}): ValidatedClaimInput {
  const name = normalizeName(raw.name);
  if (name.length < 2) {
    throw new Error("Please enter your name");
  }
  if (name.length > MAX_NAME_LENGTH) {
    throw new Error(`Name must be ${MAX_NAME_LENGTH} characters or fewer`);
  }

  const email = normalizeEmail(raw.email);
  if (!EMAIL_PATTERN.test(email)) {
    throw new Error("Please enter a valid email address");
  }

  const twitterHandle = normalizeHandle(raw.twitterHandle);
  if (!HANDLE_PATTERN.test(twitterHandle)) {
    throw new Error(
      "Please enter a valid X handle, letters numbers and underscores only"
    );
  }

  return {
    name,
    email,
    twitterHandle,
    twitterHandleRaw: raw.twitterHandle.trim(),
  };
}

/**
 * Pulls giveaway URLs out of pasted text or a Fourthwall CSV export.
 * Fourthwall's export puts one link per row, but the column position and any
 * surrounding quoting varies, so scan for URLs rather than parsing columns.
 */
export function extractLinks(input: string): Array<string> {
  const matches = input.match(/https?:\/\/[^\s",;]+/g) ?? [];
  const seen = new Set<string>();
  const links: Array<string> = [];
  for (const match of matches) {
    const url = match.replace(/[.,)]+$/, "");
    if (seen.has(url)) continue;
    seen.add(url);
    links.push(url);
  }
  return links;
}

/** Last path segment of a URL, used as the dedupe key for a giveaway link. */
export function linkCode(url: string): string {
  const withoutQuery = url.split(/[?#]/)[0];
  const segments = withoutQuery.split("/").filter((s) => s.length > 0);
  return segments[segments.length - 1] ?? url;
}
