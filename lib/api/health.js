// @ts-check
import { fetchWithRetry } from "./fetchWithRetry.js";

const DEFAULT_TIMEOUT = 8000;
const MAX_CONCURRENT_HEALTH_REQUESTS = 1;

/**
 * Fetches the backend health endpoint with timeout protection and retry.
 *
 * Accepts an optional external AbortSignal (e.g. from the calling component)
 * so callers can cancel the request on unmount. When the external signal fires
 * the AbortError is re-thrown so the caller can distinguish an unmount-cancel
 * from an internal timeout (which resolves to an "unreachable" status instead).
 *
 * @param {string} apiUrl - Base URL of the backend API.
 * @param {object} [options]
 * @param {number} [options.timeout=8000] - Timeout in milliseconds.
 * @param {AbortSignal} [options.signal] - External signal for caller-driven cancellation.
 *
 * @returns {Promise<{
 *   status: 'connected' | 'degraded' | 'unreachable',
 *   message: string,
 *   details?: any
 * }>}
 */

const inflightHealthRequests = new Map();

/**
 * Invariant: at most MAX_CONCURRENT_HEALTH_REQUESTS in-flight request per
 * (apiUrl, timeout) key. Concurrent callers without an external signal share
 * the same promise so retries and duplicate work cannot race.
 */
export async function getHealth(apiUrl, { timeout = DEFAULT_TIMEOUT, signal } = {}) {
  const controller = new AbortController();

  // Track whether the external signal caused the abort so we can re-throw
  // the caller's AbortError instead of converting it into an "unreachable"
  // result. This flag is set before calling controller.abort() so it is always honored.
  let externalAborted = false;
  let externalAbortReason;

  const onExternalAbort = () => {
    externalAborted = true;
    externalAbortReason = signal.reason;
    controller.abort(signal.reason);
  };

  if (signal) {
    if (signal.aborted) {
      throw signal.reason ?? new DOMException("Aborted", "AbortError");
    }
    signal.addEventListener("abort", onExternalAbort, { once: true });
  }

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeout);

  const inflightKey = `${apiUrl}::${timeout}`;
  const existingInflight = inflightHealthRequests.get(inflightKey);

  if (existingInflight && !signal) {
    clearTimeout(timeoutId);
    if (signal) {
      signal.removeEventListener("abort", onExternalAbort);
    }
    return existingInflight;
  }

  const requestPromise = (async () => {
  try {
    const res = await fetchWithRetry(
      `${apiUrl}/health`,
      { signal: controller.signal },
      { maxAttempts: 2, baseDelayMs: 500 }
    );

    let payload = null;

    try {
      payload = await res.json();
    } catch {
      payload = await res.text().catch(() => null);
    }

    if (!res.ok) {
      return {
        status: "degraded",
        message: `Backend responded with ${res.status}`,
        details: payload,
      };
    }

    return {
      status: "connected",
      message: "Backend is healthy",
      details: payload,
    };
  } catch (err) {
    if (externalAborted || err.name === "AbortError") {
      // External signal (e.g. component unmount) caused the abort — rethrow so
      // the caller can decide not to update state. We prefer the external
      // signal's reason when available so the caller gets the exact error it
      // caused.
      if (externalAborted) {
        throw externalAbortReason ?? err;
      }
      throw err;
    }

    return {
      status: "unreachable",
      message: err.message || "Unable to reach backend",
    };
  } finally {
    if (inflightHealthRequests.get(inflightKey) === requestPromise) {
      inflightHealthRequests.delete(inflightKey);
    }
  }
  })();

  if (!signal && inflightHealthRequests.size < MAX_CONCURRENT_HEALTH_REQUESTS) {
    inflightHealthRequests.set(inflightKey, requestPromise);
  }

  return requestPromise.finally(() => {
    clearTimeout(timeoutId);
    if (signal) {
      signal.removeEventListener("abort", onExternalAbort);
    }
  });
}
