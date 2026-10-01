/**
 * robots.txt path validation.
 *
 * Invariants:
 *  - Every emitted path starts with a single "/" and is same-origin (no scheme, no "//").
 *  - No traversal ("..", "%2e"), whitespace, control chars, "?" or "#".
 *  - Length <= MAX_PATH_LENGTH; list size <= MAX_PATHS.
 *  - Output is deduplicated and sorted, so the same input always gives the same output.
 *  - Invalid input is dropped, never thrown, so robots.txt always renders.
 *  - Rejections are reported by reason code only; raw values are never logged.
 */

export const MAX_PATH_LENGTH = 200;
export const MAX_PATHS = 50;

export const REJECT = Object.freeze({
  NOT_STRING: "not_string",
  EMPTY: "empty",
  TOO_LONG: "too_long",
  NO_LEADING_SLASH: "no_leading_slash",
  PROTOCOL_RELATIVE: "protocol_relative",
  ILLEGAL_CHARS: "illegal_chars",
  TRAVERSAL: "traversal",
  OVER_LIMIT: "over_limit",
});

// whitespace, control chars, ? and #  (query/fragment are meaningless in robots rules)
const ILLEGAL = /[\s\u0000-\u001f\u007f?#\\]/;

/** @returns {{ ok: true, path: string } | { ok: false, reason: string }} */
export function validateRobotsPath(input) {
  if (typeof input !== "string") return { ok: false, reason: REJECT.NOT_STRING };
  const path = input.trim();
  if (path.length === 0) return { ok: false, reason: REJECT.EMPTY };
  if (path.length > MAX_PATH_LENGTH) return { ok: false, reason: REJECT.TOO_LONG };
  if (!path.startsWith("/")) return { ok: false, reason: REJECT.NO_LEADING_SLASH };
  if (path.startsWith("//")) return { ok: false, reason: REJECT.PROTOCOL_RELATIVE };
  if (ILLEGAL.test(path)) return { ok: false, reason: REJECT.ILLEGAL_CHARS };
  if (/(^|\/)\.\.(\/|$)/.test(path) || /%2e%2e/i.test(path)) {
    return { ok: false, reason: REJECT.TRAVERSAL };
  }
  return { ok: true, path };
}

/**
 * Validate, dedupe, cap and sort a list of disallow paths.
 * @param {unknown} paths
 * @returns {{ paths: string[], rejected: Array<{ reason: string }> }}
 */
export function sanitizeDisallowPaths(paths) {
  const rejected = [];
  if (!Array.isArray(paths)) return { paths: [], rejected: [{ reason: REJECT.NOT_STRING }] };

  const seen = new Set();
  for (const raw of paths) {
    const result = validateRobotsPath(raw);
    if (!result.ok) {
      rejected.push({ reason: result.reason });
      continue;
    }
    seen.add(result.path); // Set = duplicate submissions collapse to one
  }

  const sorted = [...seen].sort();
  if (sorted.length > MAX_PATHS) {
    rejected.push({ reason: REJECT.OVER_LIMIT });
  }
  return { paths: sorted.slice(0, MAX_PATHS), rejected };
}

/** Site URL must be http(s); returns origin without trailing slash, or the fallback. */
export function safeSiteOrigin(value, fallback = "http://localhost:3000") {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return fallback;
    return url.origin;
  } catch {
    return fallback;
  }
}

/**
 * Builds the robots.txt metadata object.
 * Output shape matches the previous implementation: `rules` is an object,
 * and `disallow` is only present when at least one valid path remains.
 */
export function buildRobots(disallowCandidates = [], siteUrl, warn = console.warn) {
  const origin = safeSiteOrigin(siteUrl);
  const { paths, rejected } = sanitizeDisallowPaths(disallowCandidates);

  if (rejected.length > 0) {
    // reason codes only; raw values are never logged
    warn("[robots] dropped invalid disallow entries:", rejected.map((r) => r.reason).join(","));
  }

  const rules = { userAgent: "*", allow: "/" };
  if (paths.length > 0) rules.disallow = paths;

  return { rules, sitemap: `${origin}/sitemap.xml` };
}