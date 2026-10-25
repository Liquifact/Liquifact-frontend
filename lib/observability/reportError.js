/**
 * Observability & Error Reporting utility.
 *
 * Implements a pluggable client-side error reporter with shallow
 * secrets scrubbing.
 */

const SENSITIVE_KEY_REGEX = /secret|token|password|seed|key/i;

let currentReporter = (error, context) => {
  if (context !== undefined) {
    console.error(error, context);
  } else {
    console.error(error);
  }
};

/**
 * Perform shallow scrubbing on an object's keys matching sensitive patterns.
 *
 * @param {unknown} context
 * @returns {unknown}
 */
export function scrubContext(context) {
  if (!context || typeof context !== "object" || Array.isArray(context)) {
    return context;
  }

  const scrubbed = {};
  for (const [k, v] of Object.entries(context)) {
    if (SENSITIVE_KEY_REGEX.test(k)) {
      scrubbed[k] = "[REDACTED]";
    } else {
      scrubbed[k] = v;
    }
  }
  return scrubbed;
}

/**
 * Configure the reporting sink function.
 *
 * @param {((error: any, context?: any) => void) | null | undefined} fn
 */
export function setReporter(fn) {
  if (typeof fn === "function") {
    currentReporter = fn;
  } else {
    currentReporter = (error, context) => {
      if (context !== undefined) {
        console.error(error, context);
      } else {
        console.error(error);
      }
    };
  }
}

/**
 * Report an error to the configured sink with shallow context scrubbing.
 *
 * @param {any} error
 * @param {Record<string, any>} [context]
 */
export function reportError(error, context) {
  try {
    const safeContext = scrubContext(context);
    currentReporter(error, safeContext);
  } catch {
    // A throwing reporter must never cause reportError itself to throw.
  }
}
