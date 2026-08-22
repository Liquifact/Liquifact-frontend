/**
 * Centralised security-header / Content-Security-Policy construction.
 *
 * This module is the single source of truth for the HTTP response headers that
 * `next.config.mjs` attaches to every route (see its `headers()` function). It
 * is kept separate from the Next config so it can be unit-tested in isolation
 * (see `security/headers.test.tsx`) and reused by middleware later if we move to
 * per-request CSP nonces.
 *
 * Design goals:
 *  - Ship a strict, deny-by-default CSP before wallet/API integration handles
 *    financial data.
 *  - Never break the two external integrations the app actually relies on:
 *      1. fetch() calls to the backend (NEXT_PUBLIC_API_URL) — allowed via
 *         connect-src.
 *      2. Geist fonts loaded through next/font/google — self-hosted from the
 *         app origin at build time, with Google Fonts hosts allow-listed as a
 *         defensive fallback.
 */

/** Default backend origin, mirrors the fallback used in app/page.js. */
export const DEFAULT_API_URL = "http://localhost:3001";

/**
 * Extract the scheme://host[:port] origin from a URL string so it can be used
 * as a CSP source expression. Returns `null` for empty / malformed values so
 * callers can simply skip adding an invalid source rather than emitting a
 * broken policy.
 *
 * @param {string | undefined | null} apiUrl
 * @returns {string | null}
 */
export function getApiOrigin(apiUrl) {
  const value = (apiUrl ?? "").trim();
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

/**
 * Build the Content-Security-Policy header value.
 *
 * @param {object} [options]
 * @param {string} [options.apiUrl]  Value of NEXT_PUBLIC_API_URL.
 * @param {boolean} [options.isDev]  True in `next dev` (relaxes a few rules so
 *                                   Hot Module Replacement keeps working).
 * @param {string} [options.nonce]   Request-scoped nonce for inline scripts.
 * @returns {string} A single-line CSP suitable for the header value.
 */
export function buildContentSecurityPolicy({
  apiUrl = DEFAULT_API_URL,
  isDev = false,
  nonce,
} = {}) {
  const apiOrigin = getApiOrigin(apiUrl);

  // connect-src governs fetch()/XHR/WebSocket. We allow our own origin plus the
  // backend API origin so the health check and future data fetches keep
  // working. In development we also allow ws:/wss: so Next.js HMR can connect.
  const connectSrc = ["'self'", apiOrigin].filter(Boolean).concat(isDev ? ["ws:", "wss:"] : []);

  // script-src uses a per-request nonce for inline scripts so we no longer
  // need to rely on 'unsafe-inline'. 'unsafe-eval' is ONLY added in
  // development because React Fast Refresh / HMR relies on eval; it is never
  // shipped to production.
  const scriptSrc = ["'self'"].concat(nonce ? [`'nonce-${nonce}'`] : []);
  if (isDev) scriptSrc.push("'unsafe-eval'");

  const directives = {
    // Deny-by-default: anything not explicitly listed below falls back to this.
    "default-src": ["'self'"],
    // Lock <base> so an injected tag cannot rewrite relative URLs.
    "base-uri": ["'self'"],
    // No plugins / <object>/<embed> — not used by the app.
    "object-src": ["'none'"],
    // Clickjacking protection (modern equivalent of X-Frame-Options: DENY).
    "frame-ancestors": ["'none'"],
    // Forms may only submit back to our own origin.
    "form-action": ["'self'"],
    "script-src": scriptSrc,
    // style-src needs 'unsafe-inline': both next/font and Tailwind/Next inject
    // inline <style> tags and style attributes for critical CSS and font
    // variables. Hashing them is impractical because they are generated per
    // build/request, so 'unsafe-inline' is the documented, accepted trade-off
    // for styles only (scripts remain far more tightly controlled).
    // fonts.googleapis.com is allow-listed for the Google Fonts stylesheet.
    "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    // Geist is self-hosted by next/font at build time (served from our origin);
    // fonts.gstatic.com and data: are defensive fallbacks.
    "font-src": ["'self'", "https://fonts.gstatic.com", "data:"],
    // Allow inline data/blob images (e.g. generated SVGs, favicons).
    "img-src": ["'self'", "data:", "blob:"],
    "connect-src": connectSrc,
    "manifest-src": ["'self'"],
    // Disallow being embedded as a worker source from elsewhere.
    "worker-src": ["'self'", "blob:"],
  };

  return Object.entries(directives)
    .map(([directive, sources]) => `${directive} ${sources.join(" ")}`)
    .join("; ");
}

/**
 * Build the full list of security response headers in the `{ key, value }`
 * shape expected by Next.js `headers()`.
 *
 * @param {object} [options]
 * @param {string} [options.apiUrl]
 * @param {boolean} [options.isDev]
 * @param {string} [options.nonce]
 * @returns {{ key: string, value: string }[]}
 */
export function buildSecurityHeaders({ apiUrl = DEFAULT_API_URL, isDev = false, nonce } = {}) {
  return [
    {
      // The CSP is the primary defence against XSS and data-injection attacks.
      key: "Content-Security-Policy",
      value: buildContentSecurityPolicy({ apiUrl, isDev, nonce }),
    },
    {
      // Stop browsers MIME-sniffing responses away from the declared type.
      key: "X-Content-Type-Options",
      value: "nosniff",
    },
    {
      // Send origin (not full path/query) on cross-origin navigations; full
      // URL only stays same-origin. Avoids leaking invoice/wallet identifiers.
      key: "Referrer-Policy",
      value: "strict-origin-when-cross-origin",
    },
    {
      // Legacy clickjacking protection for browsers that ignore
      // frame-ancestors. DENY = never frameable.
      key: "X-Frame-Options",
      value: "DENY",
    },
    {
      // Disable powerful browser features the app does not use, shrinking the
      // attack surface for compromised third-party code.
      key: "Permissions-Policy",
      value:
        "camera=(), microphone=(), geolocation=(), browsing-topics=(), payment=(), usb=(), magnetometer=(), accelerometer=(), gyroscope=()",
    },
    {
      // Force HTTPS for two years (incl. subdomains). Ignored by browsers over
      // plain http (e.g. localhost), so it is safe to send everywhere.
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains; preload",
    },
    {
      // Isolate the browsing context group; complements frame-ancestors and
      // mitigates cross-origin leaks (Spectre-class side channels).
      key: "Cross-Origin-Opener-Policy",
      value: "same-origin",
    },
  ];
}
