const SENSITIVE_KEYS = new Set(["password", "token", "secret", "authorization", "cookie"]);

/**
 * Default logging sink. Wraps console.error and scrubs sensitive PII/secrets.
 */
const defaultSink = (error, context) => {
  let safeContext = {};

  if (context && typeof context === "object") {
    for (const key in context) {
      if (Object.hasOwn(context, key)) {
        // Simple case-insensitive matching for sensitive keys
        if (SENSITIVE_KEYS.has(key.toLowerCase())) {
          safeContext[key] = "[REDACTED]";
        } else {
          safeContext[key] = context[key];
        }
      }
    }
  } else {
    safeContext = context;
  }

  console.error("[ErrorReporter]", error, safeContext);
};

let currentReporter = defaultSink;

/**
 * Overrides the default error logging sink.
 * Useful for injecting telemetry adapters (e.g., Sentry, Datadog).
 * @param {Function} reporterFn
 */
export const setReporter = (reporterFn) => {
  if (typeof reporterFn !== "function") {
    throw new Error("Reporter must be a function");
  }
  currentReporter = reporterFn;
};

/**
 * Resets the reporter to the default console sink.
 * Mainly used for test isolation.
 */
export const resetReporter = () => {
  currentReporter = defaultSink;
};

/**
 * Primary error boundary logging interface.
 * @param {Error} error The error object caught by the boundary
 * @param {Object} context Additional context (like route info or digest)
 */
export const reportError = (error, context) => {
  try {
    currentReporter(error, context);
  } catch (e) {
    // Failsafe if the injected reporter crashes
    console.error("Error reporter crashed:", e);
    console.error("Original error:", error);
  }
};
