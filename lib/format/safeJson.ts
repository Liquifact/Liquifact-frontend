/**
 * @file Safe JSON formatting utilities for rendering untrusted API responses.
 *
 * These helpers bound the size and shape of arbitrary JSON before it reaches
 * the DOM, preventing DoS via giant payloads or deeply nested objects.
 *
 * @module safeJson
 */

const DEFAULT_MAX_LENGTH = 2000;
const DEFAULT_MAX_DEPTH = 5;
const TRUNCATION_MARKER = "…(truncated)";

/**
 * Truncates a string to `maxLength` characters, appending a truncation marker
 * when the string is longer than the limit.
 *
 * @param value     - Value to coerce to string and truncate.
 * @param maxLength - Maximum allowed character count. Defaults to `2000`.
 * @returns Truncated string with marker if applicable.
 *
 * @example
 * truncateString("short", 100)           // "short"
 * truncateString("a".repeat(100), 10)    // "aaaaaaaaaa…(truncated)"
 * truncateString(null, 10)               // ""
 */
function truncateString(value: unknown, maxLength: number = DEFAULT_MAX_LENGTH): string {
  const str = String(value ?? "");

  if (str.length <= maxLength) {
    return str;
  }

  return str.slice(0, maxLength) + TRUNCATION_MARKER;
}

/**
 * Recursively limits the depth of an object. Any value at a depth greater
 * than `maxDepth` is replaced with a placeholder string.
 *
 * @param obj      - Value to depth-limit.
 * @param maxDepth - Maximum nesting depth. Defaults to `5`.
 * @param depth    - Internal recursion depth counter.
 * @param seen     - Internal set for circular reference detection.
 * @returns A new value with deep nesting replaced.
 *
 * @example
 * limitDepth({ a: { b: { c: 1 } } }, 2)   // { a: { b: "[Depth limit reached]" } }
 * limitDepth([1, [2, [3, [4, [5]]]]], 3)  // [1, [2, [3, "[Depth limit reached]"]]]
 */
function limitDepth(
  obj: unknown,
  maxDepth: number = DEFAULT_MAX_DEPTH,
  depth: number = 0,
  seen?: WeakSet<object>
): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === "string" || typeof obj === "number" || typeof obj === "boolean") {
    return obj;
  }

  if (depth > maxDepth) {
    return "[Depth limit reached]";
  }

  if (typeof obj === "object") {
    const seenSet = seen ?? new WeakSet<object>();

    if (seenSet.has(obj)) {
      return "[Circular]";
    }

    seenSet.add(obj);

    if (Array.isArray(obj)) {
      return obj.map((item) => limitDepth(item, maxDepth, depth + 1, seenSet));
    }

    const result: Record<string, unknown> = {};
    for (const key of Object.keys(obj)) {
      result[key] = limitDepth((obj as Record<string, unknown>)[key], maxDepth, depth + 1, seenSet);
    }
    return result;
  }

  return obj;
}

/**
 * Extracts only the specified known fields from an object, ignoring keys
 * that are not present.
 *
 * @param obj    - Source object.
 * @param fields - Keys to extract. Defaults to `['status', 'message', 'version']`.
 * @returns Plain object containing only existent fields.
 *
 * @example
 * extractKnownFields({ status: "ok", extra: 123 })
 * // { status: "ok" }
 *
 * extractKnownFields({ foo: "bar" }, ["foo", "baz"])
 * // { foo: "bar" }
 */
function extractKnownFields(
  obj: unknown,
  fields: string[] = ["status", "message", "version"]
): Record<string, unknown> {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    return {};
  }

  const result: Record<string, unknown> = {};
  for (const key of fields) {
    if (key in obj) {
      result[key] = (obj as Record<string, unknown>)[key];
    }
  }
  return result;
}

/** Options for {@link safeJsonStringify}. */
export interface SafeJsonOptions {
  /** Maximum characters for the output. Defaults to `2000`. */
  maxLength?: number;
  /** Maximum object nesting depth. Defaults to `5`. */
  maxDepth?: number;
}

/**
 * Safely stringifies a value for display by first limiting its object depth,
 * then stringifying, then truncating the resulting string.
 *
 * @param obj     - Value to stringify.
 * @param options - Optional size and depth limits.
 * @returns Safe, truncated JSON string.
 *
 * @example
 * safeJsonStringify({ a: 1, b: 2 })
 * // '{\n  "a": 1,\n  "b": 2\n}'
 *
 * safeJsonStringify("x".repeat(3000), { maxLength: 100 })
 * // "xxx…(truncated)"
 */
function safeJsonStringify(obj: unknown, options: SafeJsonOptions = {}): string {
  const { maxLength = DEFAULT_MAX_LENGTH, maxDepth = DEFAULT_MAX_DEPTH } = options;

  if (obj === undefined || obj === null) {
    return String(obj);
  }

  try {
    const depthLimited = limitDepth(obj, maxDepth);
    const json = JSON.stringify(depthLimited, null, 2);
    return truncateString(json, maxLength);
  } catch {
    return String(obj);
  }
}

export { truncateString, limitDepth, extractKnownFields, safeJsonStringify };
