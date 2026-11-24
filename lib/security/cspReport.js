/**
 * Receiver-side helpers for CSP violation reports.
 *
 * Handles both wire formats browsers send:
 *   - legacy `report-uri`:       Content-Type: application/csp-report
 *                                { "csp-report": { "blocked-uri": ..., ... } }
 *   - Reporting API `report-to`: Content-Type: application/reports+json
 *                                [ { "type": "csp-violation", "body": { ... } } ]
 *
 * Reports are untrusted input from any origin, so the endpoint caps the body
 * size, validates and truncates every field, strips query strings and
 * fragments from URLs, rate limits per client IP, de-duplicates repeats and
 * only then forwards a scrubbed summary to `reportError`.
 */

import { reportError as defaultReportError } from "../observability/reportError.js";

/** Largest request body accepted, in bytes. */
export const MAX_REPORT_BYTES = 8 * 1024;
/** Most reports taken from one Reporting API batch. */
export const MAX_REPORTS_PER_REQUEST = 10;

const MAX_URI_LENGTH = 256;
const MAX_SAMPLE_LENGTH = 128;
const MAX_DIRECTIVE_LENGTH = 64;
const DIRECTIVE_RE = /^[a-z][a-z0-9-]*$/;
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS_RE = /[\u0000-\u001f\u007f]/g;
const WEB_PROTOCOLS = new Set(["http:", "https:", "ws:", "wss:"]);

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function clean(value, max) {
  if (typeof value !== "string") return undefined;
  const stripped = value.replace(CONTROL_CHARS_RE, "").trim();
  if (!stripped) return undefined;
  return stripped.length > max ? stripped.slice(0, max) : stripped;
}

/**
 * Reduce a reported URL to `protocol//host/path`: userinfo, query string and
 * fragment can carry tokens, so they never leave this function. Keywords the
 * browser sends instead of a URL ("inline", "eval", "self", "data") pass
 * through, and non-web schemes such as `data:` keep only the scheme.
 *
 * @param {unknown} value
 * @returns {string|undefined}
 */
export function sanitizeUri(value) {
  const text = clean(value, 2048);
  if (text === undefined) return undefined;
  let parsed;
  try {
    parsed = new URL(text);
  } catch {
    return text.slice(0, MAX_URI_LENGTH);
  }
  if (!WEB_PROTOCOLS.has(parsed.protocol)) {
    return parsed.protocol.length > 1 && /^[a-z][a-z0-9+.-]*:$/.test(parsed.protocol)
      ? parsed.protocol
      : text.slice(0, MAX_URI_LENGTH);
  }
  return `${parsed.protocol}//${parsed.host}${parsed.pathname}`.slice(0, MAX_URI_LENGTH);
}

function toCount(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : undefined;
}

function pick(raw, ...keys) {
  for (const key of keys) {
    if (raw[key] !== undefined && raw[key] !== null) return raw[key];
  }
  return undefined;
}

function normalizeFields(raw) {
  const directiveSource = clean(
    pick(raw, "effectiveDirective", "effective-directive", "violatedDirective", "violated-directive"),
    256,
  );
  // `violated-directive` carries the policy value too ("script-src 'self'"); keep the name.
  const directive = directiveSource?.split(/\s+/)[0]?.toLowerCase().slice(0, MAX_DIRECTIVE_LENGTH);
  if (!directive || !DIRECTIVE_RE.test(directive)) return null;

  const disposition = clean(pick(raw, "disposition"), 16);
  return {
    directive,
    blockedUri: sanitizeUri(pick(raw, "blockedURL", "blocked-uri", "blockedUri")) ?? "",
    documentUri: sanitizeUri(pick(raw, "documentURL", "document-uri", "documentUri")),
    sourceFile: sanitizeUri(pick(raw, "sourceFile", "source-file")),
    lineNumber: toCount(pick(raw, "lineNumber", "line-number")),
    columnNumber: toCount(pick(raw, "columnNumber", "column-number")),
    disposition: disposition === "enforce" || disposition === "report" ? disposition : undefined,
    sample: clean(pick(raw, "sample", "script-sample"), MAX_SAMPLE_LENGTH),
  };
}

/**
 * Turn a parsed request body into normalized reports. Accepts a legacy
 * `{ "csp-report": {...} }` object and a Reporting API array of
 * `{ type: "csp-violation", body: {...} }` entries (a single such object is
 * accepted too). Anything else is skipped. Never throws.
 *
 * @param {unknown} body
 * @returns {Array<{directive: string, blockedUri: string, documentUri?: string,
 *   sourceFile?: string, lineNumber?: number, columnNumber?: number,
 *   disposition?: "enforce"|"report", sample?: string}>}
 */
export function normalizeReport(body) {
  const items = Array.isArray(body) ? body : [body];
  const reports = [];
  for (const item of items.slice(0, MAX_REPORTS_PER_REQUEST)) {
    if (!isObject(item)) continue;
    let raw = null;
    if (isObject(item["csp-report"])) {
      raw = item["csp-report"];
    } else if (item.type === "csp-violation" && isObject(item.body)) {
      raw = item.body;
    }
    if (!raw) continue;
    const report = normalizeFields(raw);
    if (report) reports.push(report);
  }
  return reports;
}

/**
 * Per-key in-memory token bucket. `take(key)` spends a token and returns
 * `{ allowed, retryAfterSeconds }`. Time comes from `now()` so tests can drive
 * it. Idle full buckets are dropped once `maxKeys` is reached, so memory stays
 * bounded.
 *
 * @param {{capacity?: number, refillPerSecond?: number, maxKeys?: number, now?: () => number}} [options]
 */
export function createRateLimiter({ capacity = 20, refillPerSecond = 1, maxKeys = 5000, now = Date.now } = {}) {
  const buckets = new Map();

  function refill(bucket, at) {
    const elapsed = Math.max(0, at - bucket.updatedAt) / 1000;
    bucket.tokens = Math.min(capacity, bucket.tokens + elapsed * refillPerSecond);
    bucket.updatedAt = at;
  }

  function prune(at) {
    for (const [key, bucket] of buckets) {
      refill(bucket, at);
      if (bucket.tokens >= capacity) buckets.delete(key);
    }
    // Still full of active clients: drop the oldest so the map cannot grow.
    while (buckets.size >= maxKeys) {
      buckets.delete(buckets.keys().next().value);
    }
  }

  return {
    take(key) {
      const at = now();
      let bucket = buckets.get(key);
      if (!bucket) {
        if (buckets.size >= maxKeys) prune(at);
        bucket = { tokens: capacity, updatedAt: at };
        buckets.set(key, bucket);
      } else {
        refill(bucket, at);
      }
      if (bucket.tokens >= 1) {
        bucket.tokens -= 1;
        return { allowed: true, retryAfterSeconds: 0 };
      }
      const retryAfterSeconds = Math.max(1, Math.ceil((1 - bucket.tokens) / refillPerSecond));
      return { allowed: false, retryAfterSeconds };
    },
    get size() {
      return buckets.size;
    },
  };
}

/**
 * Key used to collapse repeats: the same directive blocked from the same host.
 *
 * @param {{directive: string, blockedUri: string}} report
 * @returns {string}
 */
export function dedupeKey(report) {
  const blocked = report.blockedUri || "";
  let host = blocked;
  try {
    const parsed = new URL(blocked);
    if (WEB_PROTOCOLS.has(parsed.protocol)) host = parsed.host;
  } catch {
    // A keyword such as "inline" or "eval" is its own host.
  }
  return `${report.directive}|${host.toLowerCase()}`;
}

/**
 * Remembers keys for `windowMs`. `isDuplicate(key)` is true when the key was
 * seen inside the window (and does not extend it); otherwise it records the
 * key and returns false. Expired entries are dropped once `maxEntries` is hit.
 *
 * @param {{windowMs?: number, maxEntries?: number, now?: () => number}} [options]
 */
export function createDeduper({ windowMs = 60_000, maxEntries = 1000, now = Date.now } = {}) {
  const seen = new Map();

  return {
    isDuplicate(key) {
      const at = now();
      const firstSeen = seen.get(key);
      if (firstSeen !== undefined && at - firstSeen < windowMs) return true;
      if (seen.size >= maxEntries) {
        for (const [k, t] of seen) {
          if (at - t >= windowMs) seen.delete(k);
        }
        while (seen.size >= maxEntries) {
          seen.delete(seen.keys().next().value);
        }
      }
      seen.delete(key);
      seen.set(key, at);
      return false;
    },
    get size() {
      return seen.size;
    },
  };
}

/**
 * Forward a normalized report to `reportError`, which scrubs sensitive keys
 * and Stellar secret seeds from the context.
 *
 * @param {ReturnType<typeof normalizeReport>[number]} report
 * @param {(error: unknown, context?: Record<string, unknown>) => void} [reporter]
 */
export function forwardReport(report, reporter = defaultReportError) {
  reporter(new Error(`CSP violation: ${report.directive} blocked ${report.blockedUri || "(unknown)"}`), {
    source: "csp-report",
    ...report,
  });
}

/**
 * Best-effort client address for rate limiting. `x-forwarded-for` is only as
 * trustworthy as the proxy in front of the app.
 *
 * @param {Headers} headers
 * @returns {string}
 */
export function getClientIp(headers) {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const candidate = forwarded || headers.get("x-real-ip")?.trim();
  return candidate ? candidate.slice(0, 64) : "unknown";
}

async function readCapped(request, maxBytes) {
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => {});
      return null;
    }
    chunks.push(value);
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(merged);
}

function respond(status, headers = {}) {
  return new Response(null, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

const ACCEPTED_TYPES = new Set(["application/csp-report", "application/reports+json"]);

/**
 * Build the POST handler for `/api/csp-report`. Dependencies are injectable so
 * tests can supply a clock and a reporter.
 *
 * Responses: 204 accepted (including rate-limit-free duplicates), 400 body is
 * not JSON or holds no valid report, 413 body over the cap, 415 wrong content
 * type, 429 rate limited. It never throws.
 *
 * @param {{reporter?: Function, limiter?: ReturnType<typeof createRateLimiter>,
 *   deduper?: ReturnType<typeof createDeduper>, maxBytes?: number}} [deps]
 * @returns {(request: Request) => Promise<Response>}
 */
export function createCspReportHandler({
  reporter = defaultReportError,
  limiter = createRateLimiter(),
  deduper = createDeduper(),
  maxBytes = MAX_REPORT_BYTES,
} = {}) {
  return async function handleCspReport(request) {
    try {
      const limit = limiter.take(getClientIp(request.headers));
      if (!limit.allowed) {
        return respond(429, { "Retry-After": String(limit.retryAfterSeconds) });
      }

      const type = (request.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
      if (!ACCEPTED_TYPES.has(type)) return respond(415);

      const declared = Number(request.headers.get("content-length"));
      if (Number.isFinite(declared) && declared > maxBytes) return respond(413);

      const text = await readCapped(request, maxBytes);
      if (text === null) return respond(413);

      let body;
      try {
        body = JSON.parse(text);
      } catch {
        return respond(400);
      }

      const reports = normalizeReport(body);
      if (reports.length === 0) return respond(400);

      for (const report of reports) {
        if (deduper.isDuplicate(dedupeKey(report))) continue;
        forwardReport(report, reporter);
      }
      return respond(204);
    } catch {
      // A malformed or hostile request must never surface as an unhandled error.
      return respond(400);
    }
  };
}
