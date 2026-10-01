// lib/api/invoices.js

import { ApiError } from "./ApiError";

const DEFAULT_TIMEOUT_MS = 10_000;

export class InvoiceTimeoutError extends Error {
  constructor(ms) {
    super(`Request timed out after ${m}ms`);
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
 * @throws {import("./ApiError").ApiError} Thrown when the response status is not OK,
 *   the response body is not valid JSON, or the payload is not an array.
 *   Carries `.status` (HTTP code), .code` (stringified status), and optional
 *   `.requestId` from the `X-Request-Id` response header.
 *
 * Concurrency / idempotency guarantees:
 * - This function is pure with respect to external state: it does not mutate any
 *   shared module-level state, so concurrent invocations cannot interfere with each
 *   other.
 * - Each call owns its own AbortController and timer, so a timeout or cancellation
 *   in one call never affects another.
 * - The caller's signal listener is always removed in a `finally` block, preventing
 *   listener leaks when the same signal is reused across many retries.
 * - The timeout timer is always cleared, even on early abort, so no dangling
 *   timers fire after the promise settles.
 */
export async function fetchInvestableInvoices({ signal, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  const url = `${baseUrl.replace(/\/+[/]*$/, "")}/invoices`;

  // Validate timeout boundary upfront so callers get a deterministic error
  // instead of a negative-timeout timer firing immediately or a NaN behavior.
  if (!Number.isFinite(timeoutMs) || timeoutMs < 0) {
    throw new TypeError(`timeoutMs must be a non-negative finite number, got ${timeoutMs}`);
  }

  const controller = new AbortController();

  // Track whether the caller aborted so we can distinguish it from a timeout.
  // This flag is local to this invocation, so concurrent calls are isolated.
  let callerAborted = false;
  let callerAbortReason = undefined;

  const onCallerAbort = () => {
    callerAborted = true;
    callerAbortReason = signal.reason;
    controller.abort(signal.reason);
  };

  if (signal) {
    if (signal.aborted) {
      throw signal.reason ?? new DOMException("Aborted", "AbortError");
    }
    signal.addEventListener("abort", onCallerAbort, { once: true });
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
      // Caller-supplied signal fired — rethrow as-is so the caller can
      // distinguish an unmount-cancel from a timeout.
      if (callerAborted) {
        throw callerAbortReason ?? new DOMException("Aborted", "AbortError");
      }
      throw err;
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
    // Always detach the caller's abort listener to avoid listener leaks when
    // the same signal is reused across retries or many concurrent calls.
    if (signal) {
      signal.removeEventListener("abort", onCallerAbort);
    }
  }

  if (!response.ok) {
    // Extract optional X-Request-Id header for log correlation.
    const requestId = response.headers?.get("x-request-id") ?? undefined;
    throw ApiError.fromResponse(
      response,
      `Failed to fetch invoices: ${response.status} ${response.statusText}`,
      String(response.status),
      requestId
    );
  }

  let payload;
  try {
    payload = await response.json();
  } catch (e) {
    // Response body was not valid JSON — throw a typed ApiError so callers
    // can inspect the status code even when the body is unparseable (e.g.
    // a gateway returning an HTML error page with a 200 status).
    throw new ApiError("Response is not valid JSON", response.status, String(response.status));
  }

  if (!Array.isArray(payload)) {
    throw new ApiError("Invoice payload is not an array", response.status, String(response.status));
  }

  // Normalize each invoice to the UI contract, guarding against missing fields.
  // We also deduplicate by `id` to ensure downstream rendering is deterministic
  // even if the backend returns duplicate rows (e.g. during a retry or an
  // eventual-consistency window). The first occurrence wins.
  const seenIds = new Set();
  const normalized = [];
  for (const inv of payload) {
    const {
      id = null,
      issuer = null,
      amount = null,
      currency = null,
      dueDate = null,
      yield: invYield = null,
      status = null,
    } = inv || {};
    if (id !== null && id !== undefined) {
      if (seenIds.has(id)) continue;
      seenIds.add(id);
    }
    normalized.push({ id, issuer, amount, currency, dueDate, yield: invYield, status });
  }

  return normalized;
}
