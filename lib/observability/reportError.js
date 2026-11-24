/**
 * Observability & Error Reporting utility.
 *
 * Implements a pluggable client-side error reporter with secrets scrubbing.
 */

const SENSITIVE_KEY_REGEX = /secret|token|password|seed|key/i;
const STELLAR_SECRET_SEED_REGEX = /S[A-Z2-7]{55}/g;
const MAX_SCRUB_DEPTH = 5;

let currentReporter = (error, context) => {
  if (context !== undefined) {
    console.error(error, context);
  } else {
    console.error(error);
  }
};

/**
 * Recursively scrub sensitive keys and Stellar secret seeds from report data.
 *
 * @param {unknown} context
 * @returns {unknown}
 */
export function scrubContext(context) {
  return scrubValue(context, 0, new WeakMap());
}

function scrubString(value) {
  return value.replace(STELLAR_SECRET_SEED_REGEX, "[REDACTED]");
}

function isPlainObject(value) {
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function scrubValue(value, depth, seen) {
  if (typeof value === "string") {
    return depth <= MAX_SCRUB_DEPTH ? scrubString(value) : value;
  }
  if (!value || typeof value !== "object" || depth > MAX_SCRUB_DEPTH) {
    return value;
  }

  if (!Array.isArray(value) && !(value instanceof Error) && !isPlainObject(value)) {
    return value;
  }
  if (seen.has(value)) {
    return seen.get(value);
  }

  const scrubbed = Array.isArray(value)
    ? new Array(value.length)
    : Object.create(Object.getPrototypeOf(value));
  seen.set(value, scrubbed);

  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      if (Object.prototype.hasOwnProperty.call(value, index)) {
        scrubbed[index] = scrubValue(value[index], depth + 1, seen);
      }
    }
    return scrubbed;
  }

  if (value instanceof Error) {
    for (const key of Reflect.ownKeys(value)) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !Object.prototype.hasOwnProperty.call(descriptor, "value")) {
        Object.defineProperty(scrubbed, key, descriptor);
        continue;
      }

      descriptor.value =
        typeof key === "string" && SENSITIVE_KEY_REGEX.test(key)
          ? "[REDACTED]"
          : scrubValue(descriptor.value, depth + 1, seen);
      Object.defineProperty(scrubbed, key, descriptor);
    }
    return scrubbed;
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    Object.defineProperty(scrubbed, key, {
      configurable: true,
      enumerable: true,
      writable: true,
      value: SENSITIVE_KEY_REGEX.test(key)
        ? "[REDACTED]"
        : scrubValue(nestedValue, depth + 1, seen),
    });
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
 * Report an error to the configured sink with recursive scrubbing.
 *
 * @param {any} error
 * @param {Record<string, any>} [context]
 */
export function reportError(error, context) {
  try {
    const safeError = scrubContext(error);
    const safeContext = scrubContext(context);
    currentReporter(safeError, safeContext);
  } catch {
    // A throwing reporter must never cause reportError itself to throw.
  }
}
