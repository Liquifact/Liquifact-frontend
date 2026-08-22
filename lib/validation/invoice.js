/**
 * @file lib/validation/invoice.js
 *
 * Client-side validators for invoice metadata inputs.
 *
 * These rules mirror the checks the backend will perform when a user saves
 * an inline edit on an invoice. They are intentionally stricter than the
 * display-time formatters (`lib/format/*`) but looser than any future
 * Soroban contract validation, so that:
 *
 *   - The UI blocks obviously broken drafts (empty, NaN, past dates, etc.).
 *   - The server still has the final word on canonical validation.
 *   - Tests can exercise the validators without rendering React.
 *
 * Each validator returns either:
 *   - `null`        – the value is acceptable; safe to submit.
 *   - errorMessage  – a short string explaining why the value is invalid;
 *                     the calling form renders this inline and disables submit.
 *
 * Validators take the *trimmed* raw string from the `<input>`. They never
 * assume the value has been parsed elsewhere. Numeric parsing accepts both
 * "123" and "12,500" so users can paste comma-separated amounts.
 *
 * The same module powers both `app/invest/[id]/InvoiceDetailClient.jsx`
 * (inline edit on the detail page) and `components/EditableInvoiceRow.jsx`
 * (inline edit on the marketplace rows).
 */

import { INVOICE_STATUSES } from "@/lib/types/invoice";

/**
 * A validator takes a trimmed string and returns `null` when valid,
 * or a short error message (non-empty string) when invalid.
 *
 * @typedef {(value: string) => string | null} InvoiceFieldValidator
 */

/** ISO-8601 calendar date (YYYY-MM-DD) matcher. */
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Helper: coerce "12,500.00" → 12500 (or `NaN` when unparseable). */
function parseAmountLike(value) {
  if (typeof value !== "string") return NaN;
  const cleaned = value.replace(/,/g, "").trim();
  if (cleaned === "") return NaN;
  return Number(cleaned);
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-field validators
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Issuer must be a non-empty trimmed string.
 *
 * @type {InvoiceFieldValidator}
 */
export const validateIssuer = (value) => {
  if (typeof value !== "string" || value.trim() === "") {
    return "Issuer cannot be empty.";
  }
  return null;
};

/**
 * Amount must be a finite number strictly greater than zero. Comma-separated
 * values such as "12,500" are accepted. Negative, zero, NaN, and empty
 * values are rejected.
 *
 * @type {InvoiceFieldValidator}
 */
export const validateAmount = (value) => {
  const numeric = parseAmountLike(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return "Amount must be a positive number.";
  }
  return null;
};

/**
 * Yield is an annualised percentage. Must be a finite number in the range
 * 0–100 (inclusive). Negative values, NaN, and non-numeric text are rejected.
 *
 * @type {InvoiceFieldValidator}
 */
export const validateYield = (value) => {
  const numeric = parseAmountLike(value);
  if (!Number.isFinite(numeric) || numeric < 0 || numeric > 100) {
    return "Yield must be a non-negative number (0-100).";
  }
  return null;
};

/**
 * Maturity must be a syntactically valid ISO-8601 calendar date (YYYY-MM-DD).
 *
 * We intentionally do NOT reject dates in the past here. Real-world invoices
 * can legitimately have a past maturity (the `Overdue` status exists for
 * exactly this case), and rejecting past dates client-side would prevent users
 * from editing or correcting already-overdue invoices. The server still applies
 * business rules for the maturity-vs-status relationship.
 *
 * Constructing a date with `new Date(\`${value}T00:00:00Z\`)` lets us
 * catch impossible calendar dates (`"2026-02-30"`) that pass the
 * `YYYY-MM-DD` regex but represent non-existent days.
 *
 * @type {InvoiceFieldValidator}
 */
export function validateDueDate(value) {
  if (typeof value !== "string" || !ISO_DATE_RE.test(value)) {
    return "Maturity must be a valid date (YYYY-MM-DD).";
  }
  const target = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(target.getTime())) {
    return "Maturity must be a valid date (YYYY-MM-DD).";
  }
  // Round-trip through ISO to confirm the parser understood the calendar date
  // (e.g. fails for "2026-02-30" which silently rolls into early March).
  const iso = target.toISOString().slice(0, 10);
  if (iso !== value) {
    return "Maturity must be a valid date (YYYY-MM-DD).";
  }
  return null;
}

/**
 * Currency must be a 3-letter ISO 4217 code (e.g. "USD", "EUR", "USDC").
 * Whitespace is trimmed before checking length / character class.
 *
 * @type {InvoiceFieldValidator}
 */
export const validateCurrency = (value) => {
  if (typeof value !== "string") {
    return "Currency must be a 3-letter ISO code.";
  }
  const trimmed = value.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(trimmed)) {
    return "Currency must be a 3-letter ISO code.";
  }
  return null;
};

/**
 * Status must be one of the canonical `INVOICE_STATUSES` values.
 *
 * @type {InvoiceFieldValidator}
 */
export const validateStatus = (value) => {
  if (typeof value !== "string") {
    return "Status must be Open, Funded, Settled, or Overdue.";
  }
  const allowed = Object.values(INVOICE_STATUSES);
  if (!allowed.includes(/** @type {any} */ (value))) {
    return "Status must be Open, Funded, Settled, or Overdue.";
  }
  return null;
};

// ─────────────────────────────────────────────────────────────────────────────
// Composite registry
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convenience map: `field name → validator`. The keys correspond to the
 * machine names used by `EditableRow` (issuer, amount, yield, dueDate) and
 * the `EditableInvoiceRow` form (issuer, amount, yield, dueDate, currency,
 * status).
 *
 * @type {Record<string, InvoiceFieldValidator>}
 */
export const invoiceFieldValidators = Object.freeze({
  issuer: validateIssuer,
  amount: validateAmount,
  yield: validateYield,
  dueDate: validateDueDate,
  currency: validateCurrency,
  status: validateStatus,
});

/**
 * Resolve the validator for a given field key. Falls back to a permissive
 * no-op validator that accepts any non-empty trimmed string — used for
 * unknown fields so a future field added to the form does not silently
 * accept garbage.
 *
 * @param {string} field - Field key (e.g. "issuer", "amount").
 * @returns {InvoiceFieldValidator}
 */
export function getInvoiceFieldValidator(field) {
  const v = invoiceFieldValidators[field];
  if (typeof v === "function") return v;
  return (value) => {
    if (typeof value !== "string" || value.trim() === "") {
      return `${field} cannot be empty.`;
    }
    return null;
  };
}

/**
 * Run every validator against an entire invoice draft and return the first
 * error found. Useful for blocking form-level submit while still allowing
 * row-level edits to surface their own inline error.
 *
 * @param {Record<string, string>} draft - e.g. `{ issuer, amount, yield, ... }`
 * @returns {{ field: string, error: string } | null}
 */
export function validateInvoiceDraft(draft) {
  if (!draft || typeof draft !== "object") return null;
  for (const [field, validate] of Object.entries(invoiceFieldValidators)) {
    if (typeof draft[field] !== "string") continue;
    const error = validate(draft[field]);
    if (error) return { field, error };
  }
  return null;
}
