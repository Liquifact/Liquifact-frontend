/**
 * Typed fetch client for the Liquifact API.
 *
 * Responsibilities:
 * - merges a caller-supplied AbortSignal with an internal timeout signal
 * - only sends Content-Type: application/json when a request body is present
 *   (avoids CORS preflights for simple GETs)
 * - parses JSON defensively and maps failures onto typed error classes
 */

import {
  NetworkError,
  TimeoutError,
  HttpError,
} from "./errors.js";

/**
 * @typedef {import("./errors.js").ApiError} ApiError
 */

/**
 * @typedef {object} RequestOptions
 * @property {string} [method]
 * @property {unknown} [body]
 * @property {AbortSignal} [signal]
 * @property {Record<string, string>} [headers]
 */

/**
 * @typedef {object} CreateApiClientOptions
 * @property {string} baseUrl
 * @property {typeof fetch} [fetch]
 * @property {number} [timeoutMs]
 */

/**
 * @typedef {object} ApiClient
 * @property {(tagged: TemplateLiteralArray|string, options?: RequestOptions) => Promise<unknown>} request
 * @property {string} baseUrl
 */

const DEFAULT_TIMEOUT_MS = 8000;

/**
 * @param {unknown} value
 * @returns {boolean}
 */
function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Join a base URL and a path without doubling or dropping slashes.
 *
 * @param {string} baseUrl
 * @param {string} path
 * @returns {string}
 */
export function joinUrl(baseUrl, path) {
  if (!baseUrl) {
    return path;
  }
  if (!path) {
    return baseUrl;
  }
  const left = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const right = path.startsWith("/") ? path : `/${path}`;
  return `${left}${right}`;
}

/**
 * Determine whether a failure is a timeout (our own timer fired) rather than
 * a caller abort. The timer signal is the only one we know fired from the inside
 * of this function, so we track it explicitly.
 *
 * @param {unknown} error
 * @param {AbortSignal} timeoutSignal
 * @param {AbortSignal|undefined} callerSignal
 * @returns {ApiError}
 */
function mapAbort(error, timeoutSignal, callerSignal) {
  if (timeoutSignal.aborted && !(callerSignal && callerSignal.aborted)) {
    return new TimeoutError();
  }
  // Caller aborted: rethrow the original abort reason so callers can detect it.
  if (callerSignal && callerSignal.aborted) {
    return error;
  }
  // Fallback: treat any abort as a timeout if nothing else matches.
  if (error && error.name === "AbortError") {
    return new TimeoutError();
  }
  return new NetworkError("Request failed", error);
}

/**
 * Create an API client bound to a base URL.
 *
 * @param {CreateApiClientOptions} options
 * @returns {ApiClient}
 */
export function createApiClient(options) {
  const {
    baseUrl,
    fetch: fetchImpl = globalThis.fetch,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = options || {};

  if (typeof fetchImpl !== "function") {
    throw new TypeError("createApiClient requires a fetch implementation");
  }

  /**
   * Perform a request and return the parsed JSON body (or null for 204/no content).
   *
   * @param {string} path
   * @param {RequestOptions} [opts]
   * @returns {Promise<unknown>}
   */
  async function request(path, opts = {}) {
    const {
      method = "GET",
      body,
      signal: callerSignal,
      headers: extraHeaders,
    } = opts;

    const timeoutController = new AbortController();
    const timer = setTimeout(() => timeoutController.abort(), timeoutMs);
    // Node.js returns a Timeout object; browsers return a number. Unref is safe
    // for both shapes.
    if (timer && typeof timer.unref === "function") {
      timer.unref();
    }

    const signal = mergeSignals(callerSignal, timeoutController.signal);

    /** @type {Record<string, string>} */
    const headers = { Accept: "application/json", ...(extraHeaders || {}) };

    /** @type {RequestInit} */
    const init = { method, headers, signal };

    // Only set Content-Type when we actually send a body. Simple GET requests
    // then remain CORS "simple" and skip the OPTIONS preflight.
    if (body !== undefined && body !== null) {
      headers["Content-Type"] = "application/json";
      init.body = typeof body === "string" ? body : JSON.stringify(body);
    }

    /** @type {Response} */
    let response;
    try {
      response = await fetchImpl(joinUrl(baseUrl, path), init);
    } catch (error) {
      clearTimeout(timer);
      throw mapAbort(error, timeoutController.signal, callerSignal);
    }

    clearTimeout(timer);

    // Read the raw text first so a non-JSON body never throws an uncontrolled
    // syntax error.
    const rawText = await response.text().catch(() => "");
    const hasBody = rawText.length > 0;
    /** @type {unknown} */
    let parsed = null;
    if (hasBody) {
      try {
        parsed = JSON.parse(rawText);
      } catch {
        parsed = undefined;
      }
    }

    if (!response.ok) {
      /** @type {unknown} */
      let details = parsed;
      if (details === undefined) {
        details = hasBody ? rawText : null;
      }
      const message =
        isPlainObject(details) && typeof details.error === "string"
          ? details.error
          : `HTTP ${response.status}`;
      throw new HttpError(response.status, message, details);
    }

    if (!hasBody) {
      return null;
    }

    if (parsed === undefined) {
      throw new HttpError(
        response.status,
        "Response was not valid JSON",
        rawText,
      );
    }

    return parsed;
  }

  return { request, baseUrl };
}

/**
 * Merge an optional caller signal with an internal signal. Returns the caller's
 * signal unchanged when there is nothing to merge, otherwise a derived
 * signal that aborts when either input aborts.
 *
 * @param {AbortSignal|undefined} callerSignal
 * @param {AbortSignal} internalSignal
 * @returns {AbortSignal}
 */
export function mergeSignals(callerSignal, internalSignal) {
  if (!callerSignal) {
    return internalSignal;
  }
  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.any === "function") {
    return AbortSignal.any([callerSignal, internalSignal]);
  }
  // Fallback for runtimes without AbortSignal.any.
  const controller = new AbortController();
  if (callerSignal.aborted || internalSignal.aborted) {
    controller.abort();
  } else {
    callerSignal.addEventListener("abort", () => controller.abort(callerSignal.reason), { once: true });
    internalSignal.addEventListener("abort", () => controller.abort(internalSignal.reason), { once: true });
  }
  return controller.signal;
}
