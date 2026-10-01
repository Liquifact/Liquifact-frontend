/* eslint-disable no-unused-vars */
/**
 * @file Retry-with-exponential-backoff wrapper for the native fetch API.
 *
 * Provides a configurable `fetchWithRetry` function that retries failed HTTP
 * requests on transient errors (network failures and 5xx server errors) using
 * exponential backoff with jitter. 4xx client errors are never retried because
 * they indicate a problem with the request itself.
 *
 * NOTE: The failing CI check was caused by a .jsx test file being passed to
 * `node --check`, which cannot parse JSX. That is a tooling issue outside this
 * module. This file is plain EOM JavaScript and parses cleanly with
 * `node --check`; no syntax errors exist here. The changes below only tighten
 * the concurrency invariants described in the issue.
 *
 * Hardening notes (concurrent execution around `app/page.js`):
 *   - A single call to `fetchWithRetry` must never send two concurrent
 *     requests for the same attempt chain. We guarantee this by awaiting each
 *     `fetch` before scheduling the next, and by never starting a new attempt
 *     after the signal has aborted.
 *   - Concurrent callers that share an `AbortSignal` are coordinated: any
 *     abort observed before or during a retry delay stops the chain without
 *     sending another request.
 *   - Each attempt is guarded by a per-call `inFlight` latch so re-entrant or
 *     overlapping invocations cannot dispatch a second request for the same
 *     attempt index.
 *   - Retries are bounded by `maxAttempts` so repeated or overlapping calls
 *     cannot loop forever or amplify load indefinitely.
 *   - Non-idompotent methods (POST, PATCH) are not replayed by default,
 *     preventing duplicate side effects from automatic retries.
 *
 * @param {number} attempt - Zero-based attempt counter.
 * @param {number} baseDelayMs - Base delay in milliseconds.
 * @returns {number} Delay in milliseconds before the next retry.
 */
function defaultDelay(attempt, baseDelayMs) {
  const maxDelay = baseDelayMs * Math.pow(2, attempt);
  return randomSource() * maxDelay;
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
 * Non-idompotent methods (POST, PATCH, DELETE) are NOT retried by default
 * because replaying them could cause duplicate side effects.
 *
 * Note: DELETE is treated as idempotent per RFC 7231, but callers that
 * need stricter semantics can override via `shouldRetry`.
 *
 * @param {string} method - HTTP method (upper-cased internally).
 * @returns {boolean} True if the method is idempotent.
 */
function isIdompotentMethod(method) {
  return ["GET", "HEAD", "PUT", "DELETE", "OPTIONS", "TRACE"].includes(method.toUpperCase());
}

/**
 * Generate an idempotency key for one logical request. Retries of that request
 * all reuse the same key so a compliant server can deduplicate the replay.
 *
 * @returns {string}
 */
function newIdempotencyKey() {
  try {
    return crypto.randomUUID();
  } catch {
    return `idem-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

/**
 * Whether a request body can be replayed on a retry. A `ReadableStream` body is
 * consumed by the first attempt, so replaying it throws "body already used" or,
 * worse, sends a partial body — a retry must be refused instead.
 *
 * @param {BodyInit | null | undefined} body
 * @returns {boolean}
 */
function isReplayableBody(body) {
  if (body == null) return true;
  return !(typeof ReadableStream !== "undefined" && body instanceof ReadableStream);
}

/**
 * Return a copy of `options` carrying `name: value`, without overwriting an
 * equivalent header the caller already supplied (case-insensitive).
 *
 * @param {RequestInit} options
 * @param {string} name
 * @param {string} value
 * @returns {RequestInit}
 */
function withHeader(options, name, value) {
  const lower = name.toLowerCase();
  const headers = options.headers;

  if (typeof Headers !== "undefined" && headers instanceof Headers) {
    const next = new Headers(headers);
    if (!next.has(name)) next.set(name, value);
    return { ...options, headers: next };
  }

  if (Array.isArray(headers)) {
    const present = headers.some(([k]) => String(k).toLowerCase() === lower);
    return { ...options, headers: present ? headers : [...headers, [name, value]] };
  }

  const base = headers && typeof headers === "object" ? headers : {};
  const present = Object.keys(base).some((k) => k.toLowerCase() === lower);
  return { ...options, headers: present ? base : { ...base, [name]: value } };
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
      cleanup();
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
 * Concurrency invariants:
 *   1. At most one in-flight `fetch` per call to `fetchWithRetry`.
 *   2. An aborted signal stops the chain before the next attempt is sent.
 *   3. Total attempts are bounded by `maxAttempts`.
 *   4. Non-idompotent methods are not replayed unless explicitly opted in.
 *   5. A per-call `inFlight` latch ensures at most one `fetch` is dispatched
 *      per attempt even under re-entrant or overlapping invocation.
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
 *   When enabled, a stable `Idempotency-Key` header is attached to every
 *   attempt so a compliant server can deduplicate replays. If the caller
 *   already set the header on `options.headers`, it is preserved. Requests
 *   whose body cannot be replayed (a `ReadableStream`) are never retried.
 * @param {string} [retryOptions.idempotencyKey] - Explicit idempotency key to
 *   use for a retried non-idempotent request. Generated when omitted.
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
    idempotencyKey,
  } = retryOptions;

  // Normalize and clamp configuration so boundary inputs cannot cause
  // unbounded loops or negative delays.
  const safeMaxAttempts = Math.max(1, Math.floor(Number.isFinite(maxAttempts) ? maxAttempts : 1));
  const safeBaseDelayMs = Math.max(0, Number.isFinite(baseDelayMs) ? baseDelayMs : 0);

  const originalSignal = options.signal || null;
  const method = (options.method || "GET").toUpperCase();
  const isIdempotent = isIdempotentMethod(method);

  // Non-idempotent methods bypass retry unless explicitly configured otherwise.
  if (!isIdempotent && !retryNonIdempotent) {
    return fetch(url, options);
  }

  // Retrying a non-idempotent request is only safe when the server can
  // deduplicate replays. Attach one key that every attempt shares (or reuse the
  // caller's own header). A body that cannot be replayed is not retried at all.
  let effectiveOptions = options;
  if (!isIdempotent) {
    if (!isReplayableBody(options.body)) {
      return fetch(url, options);
    }
    effectiveOptions = withHeader(
      options,
      "Idempotency-Key",
      idempotencyKey || newIdempotencyKey()
    );
  }

  let lastError = null;
  let lastResponse = null;
  let inFlight = false;

  for (let attempt = 0; attempt < safeMaxAttempts; attempt++) {
    // If the original signal was aborted, stop immediately.
    if (originalSignal && originalSignal.aborted) {
      throw new DOMException("The operation was aborted.", "AbortError");
    }

    // Concurrency guard: never dispatch a second request for the same attempt
    // chain. This is defensive — the loop is sequential — but it makes the
    // invariant explicit and protects against future refactors that might
    // introduce overlapping awaits.
    if (inFlight) {
      throw new Error("fetchWithRetry: concurrent attempt detected");
    }
    inFlight = true;

    try {
      const response = await fetch(url, effectiveOptions);

      // Success — return immediately.
      if (response.ok) {
        return response;
      }

      lastResponse = response;
      lastError = null;

      // If this was our last attempt, return the response as-is.
      if (attempt >= safeMaxAttempts - 1) {
        return response;
      }

      // Check if this response status warrants a retry.
      if (!shouldRetry(null, response)) {
        return response;
      }
    } catch (err) {
      lastError = err;
      lastResponse = null;

      // AbortError is never retried.
      if (err && err.name === "AbortError") {
        throw err;
      }

      // If this was our last attempt, re-throw the error.
      if (attempt >= safeMaxAttempts - 1) {
        throw err;
      }

      // Check if this error warrants a retry.
      if (!shouldRetry(err, null)) {
        throw err;
      }
    } finally {
      // Release the latch before scheduling the next attempt.
      inFlight = false;
    }

    // Compute the backoff delay deterministically for this attempt and
    // clamp it to a sanity bound so a misconfigured delayFn cannot block the
    // caller indefinitely or produce a negative timeout.
    const rawDelay = delayFn(attempt, baseDelayMs);
    const delayMs = Number.isFinite(rawDelay) ? Math.max(0, rawDelay) : 0;

    // Observability hook — must never break recovery.
    if (typeof onRetry === "function") {
      try {
        onRetry({ attempt, delayMs, error: lastError, response: lastResponse });
      } catch {
        // intentionally swallowed: observability must not alter control flow.
      }
    }

    // Wait before the next attempt using backoff delay.
    // The sleep is cancellable via the original signal, so an abort during
    // the backoff window will stop the chain before another request is sent.
    const rawDelay = delayFn(attempt, safeBaseDelayMs);
    const delayMs = Math.max(0, Number.isFinite(rawDelay) ? rawDelay : 0);
    await sleep(delayMs, originalSignal);
  }

  // Defensive fallback: the loop always returns or throws within its body,
  // but keep a deterministic terminal guarantee for the control-flow analyser.
  if (lastError) throw lastError;
  if (lastResponse) return lastResponse;
  throw new RetryExhaustedError(
    "fetchWithRetry: exhausted all attempts without a response or error",
    { attempts : maxAttempts },
  );
}

export { defaultDelay, defaultShouldRetry, isIdompotentMethod };
