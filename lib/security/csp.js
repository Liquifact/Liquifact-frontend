/**
 * Content Security Policy (CSP) builder.
 *
 * Generates a strict, nonce-based Content-Security-Policy header string.
 *
 * NOTE on style-src:
 * 'unsafe-inline' is retained for style-src because inline style attributes
 * (e.g. style={{ ... }}) are widely used across the application components
 * (such as progress bars, status indicators, and grid styles), and current CSP
 * specifications do not permit element-level inline style attributes via nonces
 * without 'unsafe-inline'.
 */

/**
 * Normalize a URL string to its origin (protocol + host + port), stripping paths and queries.
 * Throws an Error if the URL is invalid or uses an unsupported protocol.
 *
 * @param {string|undefined|null} urlStr
 * @param {string} name
 * @returns {string|null}
 */
export function normalizeOrigin(urlStr, name = "URL") {
  if (!urlStr) return null;
  const trimmed = String(urlStr).trim();
  if (!trimmed) return null;

  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(`Invalid ${name} URL: "${urlStr}"`);
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`Invalid protocol for ${name}: "${parsed.protocol}" (must be http or https)`);
  }

  return parsed.origin;
}

/**
 * Build Content-Security-Policy header value.
 *
 * @param {object} options
 * @param {string} options.nonce - Base64-encoded random nonce
 * @param {string} [options.apiUrl] - Backend API URL
 * @param {string} [options.rpcUrl] - Soroban RPC URL
 * @param {string} [options.horizonUrl] - Stellar Horizon URL
 * @param {boolean} [options.dev=false] - Whether running in development mode
 * @param {string} [options.reportUri] - Optional report-uri endpoint
 * @param {string} [options.reportTo] - Optional report-to group name
 * @returns {string} CSP header string
 */
export function buildCsp({ nonce, apiUrl, rpcUrl, horizonUrl, dev = false, reportUri, reportTo } = {}) {
  if (!nonce) {
    throw new Error("A nonce is required to build a strict Content-Security-Policy");
  }

  const scriptSrc = ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'"];
  if (dev) {
    scriptSrc.push("'unsafe-eval'");
  }

  // connect-src includes self, Friendbot, and any configured service origins (normalized to origin)
  const connectSrc = ["'self'", "https://friendbot.stellar.org"];

  const candidateUrls = [
    { value: apiUrl, name: "apiUrl" },
    { value: rpcUrl, name: "rpcUrl" },
    { value: horizonUrl, name: "horizonUrl" },
  ];

  for (const { value, name } of candidateUrls) {
    const origin = normalizeOrigin(value, name);
    if (origin && !connectSrc.includes(origin)) {
      connectSrc.push(origin);
    }
  }

  const directives = [
    "default-src 'self'",
    `script-src ${scriptSrc.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    // The PWA service worker (/sw.js) and manifest are same-origin.
    "worker-src 'self'",
    "manifest-src 'self'",
    `connect-src ${connectSrc.join(" ")}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ];

  if (!dev) {
    directives.push("upgrade-insecure-requests");
  }

  if (reportUri) {
    directives.push(`report-uri ${reportUri}`);
  }
  if (reportTo) {
    directives.push(`report-to ${reportTo}`);
  }

  return directives.join("; ");
}
