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
 * @param {unknown} value - Value to coerce to string and truncate.
 * @param {number}  [maxLength=2000] - Maximum allowed character count.
 * @returns {string} Truncated string with marker if applicable.
 */
function truncateString(value, maxLength = DEFAULT_MAX_LENGTH) {
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
 * @param {unknown} obj         - Value to depth-limit.
 * @param {number}  [maxDepth=5] - Maximum nesting depth.
 * @param {number}  [depth=0]    - Internal recursion depth counter.
 * @param {WeakSet} [seen]       - Internal set for circular reference detection.
 * @returns {unknown} A new value with deep nesting replaced.
 */
function limitDepth(obj, maxDepth = DEFAULT_MAX_DEPTH, depth = 0, seen) {
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
    const seenSet = seen ?? new WeakSet();

    if (seenSet.has(obj)) {
      return "[Circular]";
    }

    seenSet.add(obj);

    if (Array.isArray(obj)) {
      return obj.map((item) => limitDepth(item, maxDepth, depth + 1, seenSet));
    }

    const result = {};
    for (const key of Object.keys(obj)) {
      result[key] = limitDepth(obj[key], maxDepth, depth + 1, seenSet);
    }
    return result;
  }

  return obj;
}

/**
 * Extracts only the specified known fields from an object, ignoring keys
 * that are not present.
 *
 * @param {unknown}  obj             - Source object.
 * @param {string[]} [fields]        - Keys to extract. Defaults to
 *   `['status', 'message', 'version']`.
 * @returns {Record<string, unknown>} Plain object containing only existent fields.
 */
function extractKnownFields(obj, fields = ["status", "message", "version"]) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    return {};
  }

  const result = {};
  for (const key of fields) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  return result;
}

/**
 * Safely stringifies a value for display by first limiting its object depth,
 * then stringifying, then truncating the resulting string.
 *
 * @param {unknown} obj - Value to stringify.
 * @param {object}  [options]
 * @param {number}  [options.maxLength=2000] - Max characters for the output.
 * @param {number}  [options.maxDepth=5]     - Max object nesting depth.
 * @returns {string} Safe, truncated JSON string.
 */
function safeJsonStringify(
  obj,
  { maxLength = DEFAULT_MAX_LENGTH, maxDepth = DEFAULT_MAX_DEPTH } = {}
) {
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
