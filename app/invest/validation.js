/**
 * @file app/invest/validation.js
 *
 * Pure validation boundaries for the `/invest` route segment.
 *
 * Why this module exists
 * ──────────────────────
 * The marketplace has two entry points that receive untrusted input from the
 * URL/route tree:
 *
 *  - `app/invest/layout.js`  — owns the `/invest` boundary and its children.
 *  - `app/invest/[id]/page.js` — receives the dynamic `id` segment.
 *
 * Every decision about "is this input usable?" lives here as a small, pure,
 * side-effect-free function so the behaviour is deterministic for valid,
 * invalid, duplicate, and boundary-case inputs and can be unit tested in
 * isolation. The route modules only *react* to the discriminated results.
 *
 * Invariants documented here and relied on by callers:
 *
 *  1. Every validator returns a frozen-shape result object and NEVER throws.
 *  2. The result is referentially deterministic: the same input always yields a
 *     result with the same `reason`, so retries cannot diverge.
 *  3. Rejections are explicit. A validator never coerces an invalid value into
 *     a seemingly-valid one (no silent salvage), so invalid input can never be
 *     rendered as if it were real data.
 */

/** Maximum accepted length of an invoice id segment. */
export const MAX_INVOICE_ID_LENGTH = 128;

/**
 * Accepted invoice-id charset. Must start with an alphanumeric character to
 * reject path-trickery such as "." / ".." segments, then allows the characters
 * that appear in ids (`[A-Za-z0-9._:-]`).
 */
const INVOICE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;

/**
 * Stable, exhaustive rejection reasons. Callers (and logs) must branch on these
 * instead of parsing human strings.
 */
export const VALIDATION_REASONS = Object.freeze({
  // Invoice id segment
  INVALID_TYPE: "invalid_type",
  DUPLICATE_SEGMENT: "duplicate_segment",
  MISSING_ID: "missing_id",
  ID_TOO_LONG: "id_too_long",
  INVALID_CHARSET: "invalid_charset",
  // Record resolution
  NOT_FOUND: "not_found",
  MALFORMED_RECORD: "malformed_record",
  LOOKUP_FAILED: "lookup_failed",
  // Layout boundary
  INVALID_CHILDREN: "invalid_children",
  INVALID_PARAMS: "invalid_params",
});

/**
 * Validate and normalise a dynamic `[id]` route segment.
 *
 * Boundary handling:
 *  - an array (Next.js represents a repeated segment as `string[]`) → DUPLICATE_SEGMENT
 *  - a non-string (undefined / number / object)                      → INVALID_TYPE
 *  - an empty or whitespace-only string                              → MISSING_ID
 *  - longer than {@link MAX_INVOICE_ID_LENGTH} characters            → ID_TOO_LONG
 *  - a string failing {@link INVOICE_ID_PATTERN}                     → INVALID_CHARSET
 *
 * @param {unknown} raw
 * @returns {{ ok: true, id: string } | { ok: false, reason: string }}
 */
export function normalizeInvoiceId(raw) {
  if (Array.isArray(raw)) {
    return { ok: false, reason: VALIDATION_REASONS.DUPLICATE_SEGMENT };
  }
  if (typeof raw !== "string") {
    return { ok: false, reason: VALIDATION_REASONS.INVALID_TYPE };
  }
  const id = raw.trim();
  if (id.length === 0) {
    return { ok: false, reason: VALIDATION_REASONS.MISSING_ID };
  }
  if (id.length > MAX_INVOICE_ID_LENGTH) {
    return { ok: false, reason: VALIDATION_REASONS.ID_TOO_LONG };
  }
  if (!INVOICE_ID_PATTERN.test(id)) {
    return { ok: false, reason: VALIDATION_REASONS.INVALID_CHARSET };
  }
  return { ok: true, id };
}

/**
 * Validate the *shape* of a resolved invoice record before it is rendered.
 *
 * This is deliberately a structural check, not a business-rule check: it only
 * guards against a malformed/partial record reaching the view layer, where it
 * would surface as `NaN`, `undefined`, or a silently-missing row.
 *
 * @param {unknown} invoice
 * @returns {boolean}
 */
export function isWellFormedInvoice(invoice) {
  if (!invoice || typeof invoice !== "object" || Array.isArray(invoice)) {
    return false;
  }
  if (typeof invoice.id !== "string" || invoice.id.trim().length === 0) {
    return false;
  }
  if (typeof invoice.issuer !== "string" || invoice.issuer.trim().length === 0) {
    return false;
  }
  if (typeof invoice.currency !== "string" || invoice.currency.trim().length === 0) {
    return false;
  }
  if (typeof invoice.amountValue !== "number" || !Number.isFinite(invoice.amountValue)) {
    return false;
  }
  if (
    invoice.yieldValue !== undefined &&
    (typeof invoice.yieldValue !== "number" || !Number.isFinite(invoice.yieldValue))
  ) {
    return false;
  }
  return true;
}

/**
 * Validate the layout's `children` boundary.
 *
 * React treats `null`, `undefined`, and `boolean` as "render nothing". At a
 * layout boundary that would produce a blank, unexplained page, so we reject
 * those values and let the layout render its deterministic fallback instead.
 *
 * @param {unknown} children
 * @returns {{ ok: true, children: unknown } | { ok: false, reason: string }}
 */
export function validateInvestChildren(children) {
  if (children === null || children === undefined || typeof children === "boolean") {
    return { ok: false, reason: VALIDATION_REASONS.INVALID_CHILDREN };
  }
  if (Array.isArray(children)) {
    const renderable = children.filter(
      (child) => child !== null && child !== undefined && typeof child !== "boolean"
    );
    if (renderable.length === 0) {
      return { ok: false, reason: VALIDATION_REASONS.INVALID_CHILDREN };
    }
  }
  return { ok: true, children };
}

/**
 * Validate route params passed to the invest layout.
 *
 * Next.js provides segment params as `string | string[]`. Accept a missing
 * `params` (the layout has no dynamic ancestor today) but reject any value that
 * is not a string / string array so a malformed route tree fails loudly and
 * deterministically rather than being rendered.
 *
 * @param {unknown} params
 * @returns {{ ok: true, params: object } | { ok: false, reason: string, key?: string }}
 */
export function validateInvestLayoutParams(params) {
  if (params === null || params === undefined) {
    return { ok: true, params: {} };
  }
  if (typeof params !== "object" || Array.isArray(params)) {
    return { ok: false, reason: VALIDATION_REASONS.INVALID_PARAMS };
  }
  for (const key of Object.keys(params)) {
    const value = params[key];
    const validValue =
      typeof value === "string" ||
      (Array.isArray(value) && value.every((entry) => typeof entry === "string"));
    if (!validValue) {
      return { ok: false, reason: VALIDATION_REASONS.INVALID_PARAMS, key };
    }
  }
  return { ok: true, params };
}
