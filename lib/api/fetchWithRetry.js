/**
 * @file Retry-with-exponential-backoff wrapper for the native fetch API.
 *
 * Provides a configurable `fetchWithRetry` function that retries failed HTTP
 * requests on transient errors (network failures and 5xx server errors) using
 * exponential backoff with jitter. 4xx client errors are never retried because
 * they indicate a problem with the request itself.
 *
 * @module fetchWithRetry
 */

/**
 * Default delay function: exponential backoff with full jitter.
 * delay = random(0, baseDelay * 2^attempt)
 * This spreads retries from multiple clients nicely.
 *
 * @param {number} attempt - Zero-based attempt counter.
 * @param {number} baseDelayMs - Base delay in milliseconds.
 * @returns {number} Delay in milliseconds before the next retry.
 */
function defaultDelay(attempt, baseDelayMs) {
  const maxDelay = baseDelayMs * Math.pow(2, attempt);
  return Math.random() * maxDelay;
}

/**
 * Default retry predicate: only retry on network errors or 5xx server errors.
 *
 * @param {Error | null} error - The error from the rejected fetch, or null if fetch resolved.
 * @param {Response | null} response - The Response object, or null if fetch rejected.
 * @returns {boolean} True if the request should be retried.
 */
function defaultShouldRetry(error, response) {
  // Network errors (fetch rejected) are always worth retrying.
  if (error) return true;
  // Only retry 5xx server errors.
  if (response && response.status >= 500 && response.status < 600) return true;
  return false;
}

/**
 * Determines if an HTTP method is generally considered idempotent.
 * Non-idempotent methods (POST, PATCH, DELETE) are NOT retried by default
 * because replaying them could cause duplicate side effects.
 *
 * @param {string} method - HTTP method (upper-cased internally).
 * @returns {boolean} True if the method is idempotent.
 */
function isIdempotentMethod(method) {
  return ["GET", "HEAD", "PUT", "DELETE", "OPTIONS", "TRACE"].includes(method.toUpperCase());
}

/**
 * Promise-based sleep that can be cancelled via an AbortSignal.
 *
 * @param {number} ms - Milliseconds to sleep.
 * @param {AbortSignal|null} signal - Optional AbortSignal to cancel the sleep.
 * @returns {Promise<void>}
 */
export function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal && signal.aborted) {
      return reject(new DOMException("The operation was aborted.", "AbortError"));
    }

    const timer = setTimeout(() => {
      cleanup();
      resolve();
    }, ms);

    function cleanup() {
      if (signal) {
        signal.removeEventListener("abort", onAbort);
      }
    }

    function onAbort() {
      clearTimeout(timer);
      reject(new DOMException("The operation was aborted.", "AbortError"));
    }

    if (signal) {
      signal.addEventListener("abort", onAbort, { once: true });
    }
  });
}

/**
 * Wraps the native fetch API with configurable retry logic using exponential
 * backoff with jitter.
 *
 * @param {string} url - The URL to fetch.
 * @param {object} [options] - Standard fetch options (method, headers, body, signal, etc.).
 * @param {object} [retryOptions] - Retry configuration.
 * @param {number} [retryOptions.maxAttempts=3] - Maximum number of fetch attempts.
 *   The first call counts as attempt #1, so total retries = maxAttempts - 1.
 * @param {number} [retryOptions.baseDelayMs=1000] - Base delay in milliseconds
 *   for the exponential backoff calculation.
 * @param {function} [retryOptions.delayFn] - Custom delay function.
 *   Signature: (attempt: number, baseDelayMs: number) => number
 * @param {function} [retryOptions.shouldRetry] - Custom retry predicate.
 *   Signature: (error: Error | null, response: Response | null) => boolean
 * @param {boolean} [retryOptions.retryNonIdempotent=false] - If true, also retry
 *   non-idempotent methods (POST, PATCH). Defaults to false.
 * @returns {Promise<Response>} A promise that resolves with the final Response
 *   or rejects with the last error encountered.
 */
export async function fetchWithRetry(url, options = {}, retryOptions = {}) {
  const {
    maxAttempts = 3,
    baseDelayMs = 1000,
    delayFn = defaultDelay,
    shouldRetry = defaultShouldRetry,
    retryNonIdempotent = false,
  } = retryOptions;

  const originalSignal = options.signal || null;
  const method = (options.method || "GET").toUpperCase();

  // Non-idempotent methods bypass retry unless explicitly configured otherwise.
  if (!isIdempotentMethod(method) && !retryNonIdempotent) {
    return fetch(url, options);
  }

  let lastError = null;
  let lastResponse = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // If the original signal was aborted, stop immediately.
    if (originalSignal && originalSignal.aborted) {
      throw new DOMException("The operation was aborted.", "AbortError");
    }

    try {
      const response = await fetch(url, options);

      // Success — return immediately.
      if (response.ok) {
        return response;
      }

      lastResponse = response;

      // If this was our last attempt, return the response as-is.
      if (attempt >= maxAttempts - 1) {
        return response;
      }

      // Check if this response status warrants a retry.
      if (!shouldRetry(null, response)) {
        return response;
      }
    } catch (err) {
      lastError = err;

      // AbortError is never retried.
      if (err.name === "AbortError") {
        throw err;
      }

      // If this was our last attempt, re-throw the error.
      if (attempt >= maxAttempts - 1) {
        throw err;
      }

      // Check if this error warrants a retry.
      if (!shouldRetry(err, null)) {
        throw err;
      }
    }

    // Wait before the next attempt using backoff delay.
    await sleep(delayFn(attempt, baseDelayMs), originalSignal);
  }

  // Should never reach here, but satisfy the control-flow analyser.
  if (lastError) throw lastError;
  if (lastResponse) return lastResponse;
  throw new Error("Unexpected: fetchWithRetry reached end without resolution");
}

export { defaultDelay, defaultShouldRetry, isIdempotentMethod };
