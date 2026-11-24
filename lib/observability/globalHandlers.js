/**
 * lib/observability/globalHandlers.js
 *
 * Registers window `error` and `unhandledrejection` listeners that forward
 * uncaught failures to reportError.
 *
 * Features:
 *  - Deduplication: identical messages are suppressed within a 5-second window.
 *  - ResizeObserver loop-limit noise is silently ignored.
 *  - Non-Error rejection reasons are wrapped in an Error before reporting.
 *  - Returns an uninstall function that removes both listeners.
 *
 * @module globalHandlers
 */

/** Messages that are browser implementation noise, not application errors. */
const IGNORED_MESSAGES = [
  "ResizeObserver loop limit exceeded",
  "ResizeObserver loop completed with undelivered notifications",
];

/** How long (ms) to suppress duplicate messages. */
const DEDUPE_WINDOW_MS = 5000;

/**
 * Install global error and unhandledrejection listeners.
 *
 * @param {EventTarget & { addEventListener: Function; removeEventListener: Function }} target
 *   The event target to listen on — pass `window` in production, a mock in
 *   tests.
 * @param {(error: Error | unknown, context?: Record<string, unknown>) => void} report
 *   The reporting function (use reportError from reportError.js in production).
 * @returns {() => void} Uninstall function — call to remove both listeners.
 */
export function installGlobalHandlers(target, report) {
  /** @type {Map<string, number>} message -> timestamp of last report */
  const seen = new Map();

  /**
   * Returns true if this message has already been reported within
   * DEDUPE_WINDOW_MS and false (while recording it) if it is fresh.
   *
   * @param {string} message
   * @returns {boolean}
   */
  function isDuplicate(message) {
    const now = Date.now();
    const last = seen.get(message);
    if (last !== undefined && now - last < DEDUPE_WINDOW_MS) {
      return true;
    }
    seen.set(message, now);
    return false;
  }

  /**
   * Check whether a message string should be silently ignored.
   *
   * @param {string} message
   * @returns {boolean}
   */
  function isIgnored(message) {
    return IGNORED_MESSAGES.some((noise) => message.includes(noise));
  }

  /**
   * Handler for the global `error` event (uncaught synchronous exceptions and
   * resource-load errors).
   *
   * @param {ErrorEvent} event
   */
  function onError(event) {
    const message =
      (event.error instanceof Error ? event.error.message : null) ||
      event.message ||
      "Unknown error";

    if (isIgnored(message)) return;
    if (isDuplicate(message)) return;

    const error =
      event.error instanceof Error
        ? event.error
        : new Error(message);

    report(error, {
      source: "window.onerror",
      filename: event.filename || undefined,
      lineno: event.lineno || undefined,
      colno: event.colno || undefined,
    });
  }

  /**
   * Handler for the global `unhandledrejection` event (unhandled Promise
   * rejections).
   *
   * @param {PromiseRejectionEvent} event
   */
  function onUnhandledRejection(event) {
    const reason = event.reason;

    // Wrap non-Error reasons so the reporter always receives an Error.
    let error;
    if (reason instanceof Error) {
      error = reason;
    } else if (reason !== null && reason !== undefined) {
      error = new Error(String(reason));
      error.originalReason = reason;
    } else {
      error = new Error("Unhandled promise rejection");
    }

    const message = error.message || "Unhandled promise rejection";
    if (isIgnored(message)) return;
    if (isDuplicate(message)) return;

    report(error, { source: "unhandledrejection" });
  }

  target.addEventListener("error", onError);
  target.addEventListener("unhandledrejection", onUnhandledRejection);

  return function uninstall() {
    target.removeEventListener("error", onError);
    target.removeEventListener("unhandledrejection", onUnhandledRejection);
  };
}
