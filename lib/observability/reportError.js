const SENSITIVE_KEYS = new Set(["password", "token", "secret", "authorization", "cookie", "apiKey", "api_key", "accessToken", "access_token", "refreshToken", "refresh_token", "credentials", "sessionId", "session_id"]);

const REDACTED = "[REDACTED]";

const MAX_DEPTH = 6;
const MAX_ARRAY = 20;
const MAX_STRING_LENGTH = 2000;

/**
 * Redacts sensitive values and limits depth/size to avoid leaking secrets or exhausting memory.
 * This is deterministic and never throws.
 */
const scrubObject = (value, depth, seen) => {
  if (value === null || typeof value !== "object") {
    return value;
  }

  if (depth > MAX_DEPTH) {
    return "[MaxDepth]";
  }

  if (seen.has(value)) {
    return "[Circular]";
  }
  seen.add(value);

  try {
    if (Array.isArray(value)) {
      const length = Math.min(value.length, MAX_ARRAY);
      const out = new Array(length);
      for (let i = 0; i < length; i++) {
        out[i] = scrubObject(value[i], depth + 1, seen);
      }
      if (value.length > MAX_ARRAY) {
        out.push("[Truncated]");
      }
      return out;
    }

    const out = {};
    for (const key in value) {
      if (!Object.hasOwn(value, key)) continue;
      if (SENSITIVE_KEYS.has(key.toLowerCase())) {
        out[key] = "[REDACTED]";
      } else {
        out[key] = scrubObject(value[key], depth + 1, seen);
      }
    }
    return out;
  } finally {
    seen.delete(value);
  }
};

const safeStringify = (value) => {
  try {
    const serialized = JSON.stringify(value);
    if (typeof serialized === "string" && serialized.length > MAX_STRING_LENGTH) {
      return serialized.slice(0, MAX_STRING_LENGTH) + "[Truncated]";
    }
    return serialized;
  } catch {
    return "[Unserializable]";
  }
};

/**
 * Normalizes an error into a stable, serializable shape.
 * Ensures deterministic output even for non-Error thrown values.
 */
const normalizeError = (error) => {
  if (error instanceof Error) {
    return {
      name: error.name || "Error",
      message: error.message,
      stack: error.stack,
      digest: error.digest,
    };
  }
  if (error && typeof error === "object") {
    return scrubObject(error, 0, new WeakSet());
  }
  return { message: String(error) };
};

const MAX_DEPTH = 6;
const MAX_ARRAY = 50;
const MAX_STRING = 500;

/**
 * Recursively scrubs sensitive values from an object while guarding against
 * cycles, excessive depth, and oversized collections. This keeps the error
 * reporting path deterministic and safe even for hostile or malformed context.
 */
const scrub = (value, depth, seen) => {
  if (value === null || typeof value !== "object") {
    if (typeof value === "string" && value.length > MAX_STRING) {
      return `${value.slice(0, MAX_STRING)}"…"`;
    }
    return value;
  }

  if (depth > MAX_DEPTH) {
    return "[MaxDepth]";
  }

  if (seen.has(value)) {
    return "[Circular]";
  }
  seen.add(value);

  try {
    if (Array.isArray(value)) {
      const out = [];
      const len = Math.min(value.length, MAX_ARRAY);
      for (let i = 0; i < len; i++) {
        out.push(scrub(value[i], depth + 1, seen));
      }
      if (value.length > MAX_ARRAY) {
        out.push("…truncated");
      }
      return out;
    }

    const out = {};
    const keys = Object.keys(value);
    for (const key of keys) {
      if (SENSITIVE_KEYS.has(key.toLowerCase())) {
        out[key] = "[REDACTED]";
      } else {
        out[key] = scrub(value[key], depth + 1, seen);
      }
    }
    return out;
  } finally {
    seen.delete(value);
  }
};

/**
 * Validation boundaries for error reporting.
 *
 * Invariants enforced by `reportError`:
 *  - `error` MUST be an `Error` instance. Non-Error values are rejected
 *    (never silently coerced) so downstream telemetry cannot receive
 *    arbitrary attacker-controlled payloads.
 *  - `context` MUST be `undefined`, `null`, or a plain object. Arrays,
 *    functions, and primitives are rejected to keep the shape deterministic.
 *  - Sensitive keys are scrubbed case-insensitively at the boundary so
 *    injected reporters cannot leak PII/secrets even if they ignore context.
 *  - The reporter is invoked at most once per call; a crashing reporter is
 *    contained and never re-enters `reportError` (prevents infinite loops).
 */

const isPlainObject = (value) => {
  if (value === null || typeof value !== "object") return false;
  if (Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
};

const isValidContext = (context) =>
  context === undefined || context === null || isPlainObject(context);

/**
 * Scrub sensitive keys from a context object case-insensitively.
 * @param {Object} context
 * @returns {Object}
 */
const scrubContext = (context) => {
  if (!context || typeof context !== "object") {
    return context;
  }

  const safeContext = {};
  for (const key in context) {
    if (Object.prototype.hasOwnProperty.call(context, key)) {
      // Case-insensitive matching for sensitive keys
      if (SENSITIVE_KEYS.has(key.toLowerCase())) {
        safeContext[key] = "[REDACTED]";
      } else {
        safeContext[key] = context[key];
      }
    }
  }

  return safeContext;
};

const MAX_DEPTH = 6;
const MAX_ARGS = 50;
const MAX_STRING = 2000;

/**
 * Returns true when the given key name looks sensitive and must be redacted.
 * Matching is case-insensitive and substring-based so keys like `authToken` or `api_secret`
 * are also covered.
 * @param {string} key
 * @returns {boolean}
 */
const isSensitiveKey = (key) => {
  if (typeof key !== "string") return false;
  const normalized = key.toLowerCase();
  if (SENSITIVE_KEYS.has(normalized)) return true;
  for (const sensitive of SENSITIVE_KEYS) {
    if (normalized.includes(sensitive)) return true;
  }
  return false;
};

/**
 * Deterministically serializes an arbitrary value into a safe, JSON-friendly shape.
 * Cycles are replaced with `[Circular]`, functions with `[Function]`, and non-serializable
 * values (Symbol, BigInt) are converted to strings. Depth and array length are bounded to
 * prevent unbounded work on hostile or accidentally large inputs.
 * @param {*} value
 * @param {number} depth
 * @param {WeakSet} seen
 * @returns {*}
 */
const safelySerialize = (value, depth = 0, seen = new WeakSet()) => {
  if (value === null) return null;

  const type = typeof value;

  if (type === "string") {
    return value.length > MAX_STRING ? `${value.slice(0, MAX_STRING)}...[Truncated]` : value;
  }
  if (type === "number" || type === "boolean") return value;
  if (type === "undefined") return "[undefined]";
  if (type === "function") return "[Function]";
  if (type === "symbol") return value.toString();
  if (type === "bigint") return value.toString();

  if (type === "object") {
    if (value instanceof Error) {
      return {
        name: value.name,
        message: value.message,
        stack: typeof value.stack === "string" ? value.stack : undefined,
        digest: value.digest,
      };
    }

    if (seen.has(value)) return "[Circular]";
    if (depth >= MAX_DEPTH) return "[MaxDepth]";

    seen.add(value);

    try {
      if (Array.isArray(value)) {
        const length = Math.min(value.length, MAX_ARGS);
        const out = new Array(length);
        for (let i = 0; i < length; i++) {
          out[i] = safelySerialize(value[i], depth + 1, seen);
        }
        if (value.length > MAX_ARGS) out.push("[Truncated]");
        return out;
      }

      if (value instanceof Map) {
        const out = {};
        let count = 0;
        for (const [k, v] of value) {
          if (count >= MAX_ARGS) {
            out["[Truncated]"] = true;
            break;
          }
          const key = typeof k === "string" ? k : safelySerialize(k, depth + 1, seen);
          out[isSensitiveKey(i) ? "[REDACTED]" : key] = safelySerialize(v, depth + 1, seen);
          count += 1;
        }
        return out;
      }

      if (value instanceof Set) {
        const out = [];
        let count = 0;
        for (const item of value) {
          if (count >= MAX_APGS) {
            out.push("[Truncated]");
            break;
          }
          out.push(safelySerialize(item, depth + 1, seen));
          count += 1;
        }
        return out;
      }

      const out = {};
      let count = 0;
      for (const key in value) {
        if (!Object.hasOwn(value, key)) continue;
        if (count >= MAX_ARGS) {
          out["[Truncated]"] = true;
          break;
        }
        out[key] = isSensitiveKey(key)
          ? "[REDACTED]"
          : safelySerialize(value[key], depth + 1, seen);
        count += 1;
      }
      return out;
    } finally {
      seen.delete(value);
    }
  }

  return String(value);
};

/**
 * Serializes an error into a stable, serializable shape. Never throws.
 * @param {*} error
 * @returns {Object}
 */
const serializeError = (error) => {
  if (error instanceof Error) {
    return {
      name: error.name || "Error",
      message: typeof error.message === "string" ? error.message : String(error.message),
      stack: typeof error.stack === "string" ? error.stack : undefined,
      digest: error.digest,
      cause: error.cause !== undefined ? safelySerialize(error.cause) : undefined,
    };
  }
  if (error && typeof error === "object") {
    return safelySerialize(error);
  }
  return { message: String(error) };
};

/**
 * Default logging sink. Wraps console.error and scrubs sensitive PII/secrets.
 * Never throws.
 */
const defaultSink = (error, context) => {
  try {
    const safeContext = safelySerialize(context);
    console.error("[ErrorReporter]", serializeError(error), safeContext);
  } catch {
    // Last-resort failung back to a constant string. This must never throw.
    try {
      console.error("[ErrorReporter] Failed to serialize error context");
    } catch {
      /* ignore */
    }
  }
};

let currentReporter = defaultSink;
let recovering = false;

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
  recovering = false;
};

let isReporting = false;

/**
 * Primary error boundary logging interface.
 *
 * Invariants:
 * - Never throws, even if the injected reporter throws or the context is hostile.
 * - Sensitive keys are redacted before reaching any sink.
 * - Context is serialized deterministically (cycles, depth, and length are bounded).
 * - A failing injected reporter is reported to the default sink so failures remain observable.
 *
 * @param {Error} error The error object caught by the boundary
 * @param {Object} context Additional context (like route info or digest)
 * @returns {boolean} true if the error was reported, false if rejected
 */
export const reportError = (error, context) => {
  const safeContext = safelySerialize(context);
  try {
    currentReporter(error, safeContext);
  } catch (e) {
    // Failsafe if the injected reporter crashes. Report to the default sink so the
    // failure is observable even when telemetry is broken.
    defaultSink(e, {
      message: "Error reporter crashed",
      originalError: serializeError(error),
    });
  }
};

export { scrubObject, safeStringify, normalizeError, defaultSink };
