/**
 * @file lib/validation/invoiceId.js
 *
 * Pure validation helpers for the invoice route parameter `params.id`.
 *
 * Why this matters
 * ────────────────
 * `app/invest/[id]/page.js` receives `params.id` directly from the URL path.
 * Without explicit validation, a maliciously crafted URL (e.g. containing
 * null bytes, control characters, abnormally long strings, or path-traversal
 * sequences) would reach `getInvoiceById` and, eventually, any future API
 * call. Validating the segment at the page boundary ensures:
 *
 *   1. Only structurally valid IDs ever reach downstream helpers.
 *   2. Invalid IDs produce a `notFound()` (HTTP 404) response, not a 500.
 *   3. The attack surface for injection via URL segments stays minimal.
 *
 * Design decisions
 * ────────────────
 * • The regex is intentionally narrow: only ASCII alphanumeric characters
 *   and hyphens (`-`). Dots, slashes, colons, and Unicode are all rejected.
 *   Real invoice IDs in the mock data follow the pattern `inv-NNN`; the
 *   allowlist can be extended (e.g. to allow underscores) here without
 *   touching page.js.
 *
 * • `MAX_ID_LENGTH` caps the validated string at 128 characters to prevent
 *   denial-of-service via excessively long path segments. The value is
 *   deliberately generous (real IDs are ≤ 20 chars) while still bounding
 *   memory use in any downstream string operation.
 *
 * • The helper never throws: it returns a boolean so callers decide the
 *   failure mode (notFound, redirect, logging, etc.).
 *
 * Public API
 * ──────────
 * @module lib/validation/invoiceId
 *
 * @exports {number}   MAX_ID_LENGTH  — maximum allowed byte length for an id segment
 * @exports {RegExp}   VALID_ID_RE    — compiled regex an id must fully match
 * @exports {Function} isValidInvoiceId — predicate: returns true iff the id is safe
 */

/**
 * Maximum number of characters permitted in a route-parameter invoice ID.
 *
 * IDs longer than this are unconditionally rejected to bound downstream
 * string operations (database queries, log lines, cache keys, etc.) and to
 * prevent DoS via artificially large segments.
 *
 * @constant {number}
 */
export const MAX_ID_LENGTH = 128;

/**
 * Regular expression that a valid invoice ID must fully satisfy.
 *
 * Allowed characters: ASCII letters (a-z, A-Z), decimal digits (0-9),
 * and hyphens (-).  Everything else — including spaces, slashes, dots,
 * colons, null bytes, control characters, and Unicode — is rejected.
 *
 * Anchors (`^` and `$`) ensure the entire string is checked, not just a
 * substring, making the match immune to partial-match bypasses.
 *
 * @constant {RegExp}
 */
export const VALID_ID_RE = /^[a-zA-Z0-9-]+$/;

/**
 * Returns `true` when `id` is a structurally valid invoice route parameter.
 *
 * An id is valid if and only if **all** of the following hold:
 *   1. It is a non-null, non-undefined string value.
 *   2. It has a length of at least 1 (non-empty).
 *   3. Its length does not exceed `MAX_ID_LENGTH`.
 *   4. Every character matches `VALID_ID_RE` (ASCII alphanumeric + hyphens).
 *
 * This function is a pure predicate — it never mutates input, has no side
 * effects, and is safe to call from any context (server, client, tests).
 *
 * @param {unknown} id - The route-parameter value to validate.
 * @returns {boolean}  `true` when the id is structurally valid; `false` otherwise.
 *
 * @example
 * isValidInvoiceId("inv-001")          // true
 * isValidInvoiceId("INV-ACME-2024")    // true
 * isValidInvoiceId("")                 // false — empty
 * isValidInvoiceId(null)               // false — not a string
 * isValidInvoiceId("inv 001")          // false — contains space
 * isValidInvoiceId("../../../etc")     // false — path traversal characters
 * isValidInvoiceId("a".repeat(129))    // false — exceeds MAX_ID_LENGTH
 */
export function isValidInvoiceId(id) {
  if (typeof id !== "string") return false;
  if (id.length === 0) return false;
  if (id.length > MAX_ID_LENGTH) return false;
  return VALID_ID_RE.test(id);
}
