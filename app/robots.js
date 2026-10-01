/**
 * @file app/robots.js
 *
 * Next.js App Router `robots.txt` metadata route.
 *
 * ── Compatibility contract (do NOT break without a migration plan) ──────────
 * The default export is a zero-argument function whose return value is the
 * public, crawl-facing contract:
 *
 *   {
 *     rules: { userAgent: "*", allow: "/" },
 *     sitemap: "<absolute-http(s)-url>/sitemap.xml",
 *   }
 *
 * Invariants:
 *   - `rules.userAgent` is always the string "*".
 *   - `rules.allow` is always the string "/".
 *   - `sitemap` is always an absolute http(s) URL ending in "/sitemap.xml".
 *   - The route never throws: an unset, blank, malformed, or non-http(s)
 *     `NEXT_PUBLIC_SITE_URL` falls back to `DEFAULT_SITE_URL` so a bad deploy
 *     yields a safe crawl directive instead of a broken/relative sitemap.
 *
 * The helper exports below are additive (backwards compatible). Existing
 * callers that only import the default export are unaffected.
 */

/** Safe fallback origin used when the configured site URL is unusable. */
export const DEFAULT_SITE_URL = "http://localhost:3000";

/** Path appended to the resolved site URL to form the sitemap URL. */
export const SITEMAP_PATH = "/sitemap.xml";

/**
 * Schemes permitted for the crawl-facing site URL. Anything else
 * (`javascript:`, `data:`, `file:`, `ftp:`, …) is rejected so a hostile or
 * fat-fingered value can never be emitted into robots.txt / `sitemap.xml`.
 */
const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

/**
 * Resolve `NEXT_PUBLIC_SITE_URL` to a normalized, absolute http(s) origin that
 * is safe to concatenate a path onto.
 *
 * Normalization rules (deterministic for every input class):
 *   - non-string / `undefined` / `null` / blank  → `DEFAULT_SITE_URL`
 *   - unparseable (`new URL` throws)             → `DEFAULT_SITE_URL`
 *   - non-http(s) scheme                         → `DEFAULT_SITE_URL`
 *   - valid URL                                  → `origin + pathname`
 *     with trailing slashes stripped, so `https://x.com/` and
 *     `https://x.com` both yield `https://x.com` and the sitemap never
 *     contains a double slash.
 *
 * @param {unknown} [raw] Raw env value. Defaults to the live env var so the
 *   route stays reactive to `process.env` mutations (and stays testable
 *   without re-importing the module).
 * @returns {string} A normalized absolute origin, never with a trailing slash.
 */
export function resolveSiteUrl(raw = process.env.NEXT_PUBLIC_SITE_URL) {
  if (typeof raw !== "string") return DEFAULT_SITE_URL;

  const trimmed = raw.trim();
  if (trimmed === "") return DEFAULT_SITE_URL;

  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    return DEFAULT_SITE_URL;
  }

  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) return DEFAULT_SITE_URL;

  // Strip a trailing slash run so callers can append `/sitemap.xml` safely.
  const path = parsed.pathname.replace(/\/+$/, "");
  return `${parsed.origin}${path}`;
}

/**
 * Build the absolute sitemap URL from a resolved (or supplied) site URL.
 *
 * @param {string} [siteUrl] Normalized site URL. Defaults to
 *   `resolveSiteUrl()`'s current resolution.
 * @returns {string} `<siteUrl>/sitemap.xml`.
 */
export function buildSitemapUrl(siteUrl = resolveSiteUrl()) {
  return `${siteUrl}${SITEMAP_PATH}`;
}

/**
 * Robots metadata route handler.
 *
 * @returns {{ rules: { userAgent: string, allow: string }, sitemap: string }}
 */
export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: buildSitemapUrl(),
  };
}