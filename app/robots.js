/**
 * app/robots.js — App Router robots.txt route.
 *
 * This module owns the crawl-policy state that search engines treat as
 * authoritative. It is intentionally a *total, deterministic, side-effect-free*
 * function so normal operation and adverse configuration conditions cannot
 * produce an inconsistent or unsafe robots.txt.
 *
 * ── State invariants owned by this module ─────────────────────────────────
 * INV-1  Shape stability: `robots()` always returns
 *        `{ rules: { userAgent, allow }, sitemap }`. The public shape is a
 *        compatibility contract for the App Router metadata convention.
 * INV-2  Crawl policy: `rules.userAgent === "*"` and `rules.allow === "/"`,
 *        regardless of the configured site URL. Environment values may only
 *        influence `sitemap`, never the crawl policy.
 * INV-3  Canonical sitemap: `sitemap` is always an absolute `http:`/`https:`
 *        URL whose path ends in exactly `/sitemap.xml`, with no duplicate
 *        slashes, credentials, query string, or fragment.
 * INV-4  No injection: no value returned by `robots()` can contain CR/LF or
 *        other C0 control characters, so a hostile site URL cannot forge an
 *        extra robots.txt directive.
 * INV-5  Totality: `robots()` never throws. An unset, empty, malformed, or
 *        disallowed-scheme `NEXT_PUBLIC_SITE_URL` deterministically falls back
 *        to the default site URL instead of producing an unsafe result.
 * INV-6  Read-at-call: configuration is resolved on every invocation rather
 *        than cached at module load, so repeated/concurrent calls observe the
 *        current environment and cannot return stale state.
 *
 * Scheme validation mirrors `lib/config/env.js`: only `http:`/`https:` are
 * browser-safe, so `javascript:`, `data:`, `file:`, `ftp:`, … values can never
 * be concatenated into the sitemap location.
 */

/** Canonical fallback used whenever no valid site URL is configured. */
export const DEFAULT_SITE_URL = "http://localhost:3000";

/** Path appended to the normalized site origin to locate the crawl map. */
const SITEMAP_PATH = "/sitemap.xml";

/** Browser-safe URL schemes permitted in `NEXT_PUBLIC_SITE_URL`. */
const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

/**
 * Removes C0/DEL control characters (including CR/LF). A URL containing any of
 * these is rejected rather than "cleaned", so a hostile value cannot be
 * transformed into a different (still attacker-influenced) destination, and
 * diagnostics can never forge additional log lines. This guarantees INV-4.
 *
 * @param {string} value
 * @returns {string}
 */
function stripControlChars(value) {
  let output = "";
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    if (code > 0x1f && code !== 0x7f) {
      output += char;
    }
  }
  return output;
}

/**
 * Reports whether a value contains a C0/DEL control character.
 *
 * @param {string} value
 * @returns {boolean}
 */
function hasControlChars(value) {
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    if (code <= 0x1f || code === 0x7f) {
      return true;
    }
  }
  return false;
}

/**
 * Resolves the site URL and reports whether a fallback was triggered for an
 * *invalid* (as opposed to merely unset) value.
 *
 * Unset and empty-string values are treated as "use the default" without an
 * error, matching `lib/config/env.js`. Malformed or disallowed values fall
 * back to the default and are flagged invalid so the caller can log a
 * diagnosable warning.
 *
 * @param {unknown} rawValue Raw `process.env.NEXT_PUBLIC_SITE_URL`.
 * @returns {{ url: string, invalid: boolean }}
 */
function resolveSiteUrl(rawValue) {
  if (rawValue === undefined || rawValue === null) {
    return { url: DEFAULT_SITE_URL, invalid: false };
  }

  if (typeof rawValue !== "string") {
    return { url: DEFAULT_SITE_URL, invalid: true };
  }

  const candidate = rawValue.trim();
  if (candidate === "") {
    return { url: DEFAULT_SITE_URL, invalid: false };
  }

  if (hasControlChars(candidate)) {
    return { url: DEFAULT_SITE_URL, invalid: true };
  }

  let parsed;
  try {
    parsed = new URL(candidate);
  } catch {
    return { url: DEFAULT_SITE_URL, invalid: true };
  }

  if (!ALLOWED_PROTOCOLS.has(parsed.protocol) || parsed.host === "") {
    return { url: DEFAULT_SITE_URL, invalid: true };
  }

  // `parsed.origin` strips credentials/userinfo; query and fragment are not
  // meaningful for a canonical sitemap location and are dropped. Trailing
  // slashes are collapsed so we never emit `//sitemap.xml` (INV-3).
  const basePath = parsed.pathname.replace(/\/+$/, "");
  return { url: `${parsed.origin}${basePath}`, invalid: false };
}

/**
 * Normalizes a raw site-URL value into a safe, concatenation-ready base.
 * Exposed for focused tests.
 *
 * @param {unknown} rawValue
 * @returns {string} A canonical `http(s)://host[/path]` string, or the default.
 */
export function normalizeSiteUrl(rawValue) {
  return resolveSiteUrl(rawValue).url;
}

/**
 * App Router robots.txt route handler.
 *
 * @returns {{
 *   rules: { userAgent: string, allow: string },
 *   sitemap: string
 * }}
 */
export default function robots() {
  const { url: siteUrl, invalid } = resolveSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);

  if (invalid) {
    // Diagnostics without exposing secrets: NEXT_PUBLIC_* values are never
    // secret, and JSON.stringify escapes control characters so a hostile value
    // cannot forge log lines.
    console.warn(
      `[robots] NEXT_PUBLIC_SITE_URL ${JSON.stringify(
        stripControlChars(String(process.env.NEXT_PUBLIC_SITE_URL))
      )} is not a valid http(s) URL; falling back to ${DEFAULT_SITE_URL}`
    );
  }

  return Object.freeze({
    rules: Object.freeze({ userAgent: "*", allow: "/" }),
    sitemap: `${siteUrl}${SITEMAP_PATH}`,
  });
}
