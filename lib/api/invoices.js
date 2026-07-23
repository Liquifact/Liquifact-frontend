// lib/api/invoices.js

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_TEXT_LENGTH = 256;

// Regular expression matching ASCII controls, C1 controls, and Unicode Bidi override/formatting codepoints:
// - \x00-\x1F\x7F-\x9F: ASCII & C1 control chars
// - \u200E\u200F\u061C: Directional marks (LRM, RLM, ALM)
// - \u202A-\u202E: Embeddings / Overrides (LRE, RLE, PDF, LRO, RLO)
// - \u2066-\u2069: Isolates (LRI, RLI, FSI, PDI)
const DISALLOWED_TEXT_REGEX = /[\x00-\x1F\x7F-\x9F\u200E\u200F\u061C\u202A-\u202E\u2066-\u2069]/g;

/**
 * Clamps string length and strips control characters + bidi overrides.
 *
 * @param {unknown} val - Input value to sanitize
 * @param {number} [maxLength=256] - Maximum allowed string length
 * @returns {string|null} Sanitized string or null/as-is if not string
 */
export function clampAndSanitizeText(val, maxLength = DEFAULT_MAX_TEXT_LENGTH) {
  if (typeof val !== "string") {
    return val ?? null;
  }
  // 1. Strip control characters and bidi override codepoints
  const cleaned = val.replace(DISALLOWED_TEXT_REGEX, "");
  // 2. Clamp string length
  return cleaned.slice(0, maxLength);
}

export class InvoiceTimeoutError extends Error {
  constructor(ms) {
    super(`Request timed out after ${ms}ms`);
    this.name = "InvoiceTimeoutError";
  }
}

/**
 * Fetch investable invoices from the backend API.
 *
 * @param {Object} options
 * @param {AbortSignal} [options.signal] - Optional AbortSignal to cancel the request.
 * @param {number} [options.timeoutMs=10000] - Milliseconds before the request is aborted.
 * @returns {Promise<Array<Object>>} Resolves to an array of normalized invoice objects.
 * @throws {InvoiceTimeoutError} Thrown when the request exceeds `timeoutMs`.
 * @throws {Error} Thrown when the network request fails, the response status is not OK,
 *                 or when the response payload is not an array.
 */
export async function fetchInvestableInvoices({ signal, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  const url = `${baseUrl.replace(/\/+$/, "")}/invoices`;

  const controller = new AbortController();

  if (signal) {
    if (signal.aborted) {
      throw signal.reason ?? new DOMException("Aborted", "AbortError");
    }
    signal.addEventListener("abort", () => controller.abort(signal.reason), { once: true });
  }

  let timedOut = false;
  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  let response;
  try {
    response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    });
  } catch (err) {
    if (err?.name === "AbortError") {
      if (timedOut) throw new InvoiceTimeoutError(timeoutMs);
      throw err;
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch invoices: ${response.status} ${response.statusText}`);
  }

  let payload;
  try {
    payload = await response.json();
  } catch (e) {
    throw new Error("Response is not valid JSON");
  }

  if (!Array.isArray(payload)) {
    throw new Error("Invoice payload is not an array");
  }

  // Normalize each invoice to the UI contract, clamping and sanitizing string fields.
  const normalized = payload.map((inv) => {
    const {
      id = null,
      issuer = null,
      description = null,
      reference = null,
      amount = null,
      currency = null,
      dueDate = null,
      yield: invYield = null,
      status = null,
    } = inv || {};

    return {
      id,
      issuer: clampAndSanitizeText(issuer),
      description: clampAndSanitizeText(description, 1024),
      reference: clampAndSanitizeText(reference),
      amount,
      currency,
      dueDate,
      yield: invYield,
      status,
    };
  });

  return normalized;
}
