import { fetchWithRetry } from "./fetchWithRetry";

const DEFAULT_TIMEOUT = 8000;

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

export async function getHealth(apiUrl, { timeout = DEFAULT_TIMEOUT, signal } = {}) {
  const controller = new AbortController();

  if (signal) {
    if (signal.aborted) {
      throw signal.reason ?? new DOMException("Aborted", "AbortError");
    }
    signal.addEventListener("abort", () => controller.abort(signal.reason), { once: true });
  }

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeout);

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
    if (err?.name === "AbortError") {
      // External signal (e.g. component unmount) caused the abort — rethrow so
      // the caller can decide not to update state.
      if (signal?.aborted) throw err;
      return {
        status: "unreachable",
        message: "Health check timed out",
      };
    }

    return {
      status: "unreachable",
      message: err?.message || "Unable to reach backend",
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
