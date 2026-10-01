/**
 * @file lib/types/invoice.js
 * Single source of truth for the invoice data shape used across the marketplace,
 * invoice list, skeleton, and API client.
 *
 * This file owns three coupled contracts:
 *   1. The `Invoice` shape itself (typedef).
 *   2. The typed `InvoiceStatus` union and the `INVOICE_STATUSES` enum — the
 *      canonical, exhaustive vocabulary of status values the product supports.
 *   3. The `STATUS_PILL_MAP` mapping every known status to its human-readable
 *      label and Tailwind tone classes.  The map lives here, in one place, so
 *      any new status must be added to all three tables or the build will
 *      diverge.
 *   4. The validation boundaries for invoice fields consumed by
 *      `app/invest/[id]/InvoiceDetailItems.jsx` and any other surface that
 *      renders invoice line items.  Validation is centralised here so that
 *      valid, invalid, duplicate, and boundary-case inputs are handled
 *      deterministically and identically across the app.
 *
 * The actual rendering lives in `components/StatusPill.jsx`; this file is the
 * authoritative data contract it reads from.
 */

/**
 * @typedef {Object} Invoice
 * @property {string}        id        - Unique invoice identifier (e.g. "INV-001")
 * @property {string}        issuer    - Name of the invoice issuer / SME
 * @property {number|string} amount    - Invoice face value (numeric for sorting,
 *                                        formatted string for display)
 * @property {string}        currency  - ISO 4217 currency code (e.g. "USDC", "USD")
 * @property {string}        dueDate   - ISO 8601 date string (e.g. "2025-09-30")
 * @property {number|string} yield     - Expected annual yield as a percentage
 *                                        (e.g. 8.5 or "8.5%")
 * @property {InvoiceStatus} status    - One of the typed InvoiceStatus values
 */

/**
 * The exhaustive set of status values an invoice can carry.
 *
 * Consumers SHOULD treat any value outside this union as `Unknown` and render
 * the neutral pill; see `STATUS_PILL_MAP[\"Unknown\"]`.
 *
 * @typedef {"Open" | "Funded" | "Settled" | "Overdue"} InvoiceStatus
 */

/**
 * Valid invoice status values.
 *
 * TitleCase by design: matches the mock data and the InvoiceStatus union so a
 * value can be used both as a runtime comparison and a typed shape without a
 * translation layer.
 *
 * @readonly
 * @enum {InvoiceStatus}
 */
export const INVOICE_STATUSES = Object.freeze(
  /** @type {const} */ ({
    OPEN: "Open",
    FUNDED: "Funded",
    SETTLED: "Settled",
    OVERDUE: "Overdue",
  })
);

export const STATUS_PILL_MAP = Object.freeze({
  Open: {
    label: "Open",
    tone: "bg-cyan-900/40 text-cyan-300 border border-cyan-700/50",
  },
  Funded: {
    label: "Funded",
    tone: "bg-slate-700/40 text-slate-400 border border-slate-600/50",
  },
  Settled: {
    label: "Settled",
    tone: "bg-emerald-900/30 text-emerald-300 border border-emerald-700/50",
  },
  Overdue: {
    label: "Overdue by maturity",
    tone: "bg-amber-900/40 text-amber-300 border border-amber-700/50",
  },
  Unknown: {
    label: "Unknown",
    tone: "bg-slate-800/60 text-slate-400 border border-slate-700/50",
  },
});

export const INVOICE_EVENT_TYPES = Object.freeze({
  UPLOADED: "uploaded",
  VERIFIED: "verified",
  LISTED: "listed",
  FUNDED: "funded",
  SETTLED: "settled",
  UNKNOWN: "unknown",
});

/**
 * Maximum accepted length for a free-form invoice field (issuer, description,
 * etc.).  Chosen to comfortably fit the longest realistic label while keeping
 * the rendered DOM bounded and preventing pathological payloads from being
 * echoed back to the user.
 *
 * @readonly
 * @type {number}
 */
export const INVOICE_FIELD_MAX_LENGTH = 256;

/**
 * Maximum accepted magnitude for a monetary amount.  Values outside this range
 * are rejected rather than clamped, so callers cannot silently persist a
 * truncated figure.
 *
 * @readonly
 * @type {number}
 */
export const INVOICE_AMOUNT_MAX = 1e15;

/**
 * Maximum accepted yield percentage.  Yields above this are treated as invalid
 * input (likely a unit error such as a fraction passed as a percentage).
 *
 * @readonly
 * @type {number}
 */
export const INVOICE_YIELD_MAX = 1000;

export function resolveInvoiceEventLabel(type, fallback = "Unknown event") {
  switch (type) {
    case INVOICE_EVENT_TYPES.UPLOADED:
      return "Uploaded";
    case INVOICE_EVENT_TYPES.VERIFIED:
      return "Verified";
    case INVOICE_EVENT_TYPES.LISTED:
      return "Listed";
    case INVOICE_EVENT_TYPES.FUNDED:
      return "Funded";
    case INVOICE_EVENT_TYPES.SETTLED:
      return "Settled";
    default:
      return fallback;
  }
}

export function truncateActorLabel(value, maxLength = 24) {
  if (value === null || value === undefined) {
    return "Unknown actor";
  }

  const text = String(value).trim();
  if (text.length === 0) {
    return "Unknown actor";
  }

  if (text.length <= maxLength) {
    return text;
  }

  const suffixLength = Math.max(4, Math.min(8, Math.ceil(maxLength / 4)));
  const prefixLength = Math.max(6, maxLength - suffixLength - 1);
  return `${text.slice(0, prefixLength)}…${text.slice(-suffixLength)}`;
}

export function resolveStatusPill(status) {
  if (typeof status !== "string" || status.length === 0) {
    const entry = STATUS_PILL_MAP.Unknown;
    return { key: "Unknown", label: entry.label, tone: entry.tone };
  }

  const entry = Object.prototype.hasOwnProperty.call(STATUS_PILL_MAP, status)
    ? STATUS_PILL_MAP[status]
    : STATUS_PILL_MAP.Unknown;

  return {
    key: Object.prototype.hasOwnProperty.call(STATUS_PILL_MAP, status) ? status : "Unknown",
    label: entry.label,
    tone: entry.tone,
  };
}

/**
 * Canonical validation result shape returned by every validator in this file.
 *
 * `ok: true`  -> `value` holds the normalised, safe-to-render value.
 * `ok: false` -> `reason` is a stable machine-readable code and `message` is a
 *                short, non-sensitive, user-displayable explanation.
 *
 * @typedef {Object} ValidationResult
 * @property {boolean} ok
 * @property {*}       [value]
 * @property {string}  [reason]
 * @property {string}  [message]
 */

/**
 * Stable reason codes emitted by the invoice validators.  Consumers may switch
 * on these without depending on the human-readable `message`.
 *
 * @readonly
 * @enum {string}
 */
export const INVOICE_VALIDATION_REASONS = Object.freeze({
  MISSING: "missing",
  WRONG_TYPE: "wrong_type",
  EMPTY: "empty",
  TOO_LONG: "too_long",
  OUT_OF_RANGE: "out_of_range",
  NOT_FINITE: "not_finite",
  INVALID_DATE: "invalid_date",
  INVALID_STATUS: "invalid_status",
  DUPLICATE: "duplicate",
});

function ok(value) {
  return { ok: true, value };
}

function fail(reason, message) {
  return { ok: false, reason, message };
}

/**
 * Validate and normalise a required, non-empty string field.
 *
 * Boundary rules:
 *   - `null` / `undefined`                -> MISSING
 *   - non-string                           -> WRONG_TYPE
 *   - empty after trim                     -> EMPTY
 *   - length > INVOICE_FIELD_MAX_LENGTH    -> TOO_LONG
 *
 * @param {*} value
 * @param {string} [fieldName]
 * @returns {ValidationResult}
 */
export function validateInvoiceString(value, fieldName = "field") {
  if (value === null || value === undefined) {
    return fail(
      INVOICE_VALIDATION_REASONS.MISSING,
      `${fieldName} is required`
    );
  }
  if (typeof value !== "string") {
    return fail(
      INVOICE_VALIDATION_REASONS.WRONG_TYPE,
      `${fieldName} must be a string`
    );
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return fail(
      INVOICE_VALIDATION_REASONS.EMPTY,
      `${fieldName} must not be empty`
    );
  }
  if (trimmed.length > INVOICE_FIELD_MAX_LENGTH) {
    return fail(
      INVOICE_VALIDATION_REASONS.TOO_LONG,
      `${fieldName} must be at most ${INVOICE_FIELD_MAX_LENGTH} characters`
    );
  }
  return ok(trimmed);
}

/**
 * Validate a monetary amount.  Accepts finite numbers or numeric strings
 * (including formatted strings such as "1,234.56").  Rejects NaN, Infinity,
 * negative values, and values above INVOICE_AMOUNT_MAX.
 *
 * @param {*} value
 * @param {string} [fieldName]
 * @returns {ValidationResult}
 */
export function validateInvoiceAmount(value, fieldName = "amount") {
  if (value === null || value === undefined) {
    return fail(
      INVOICE_VALIDATION_REASONS.MISSING,
      `${fieldName} is required`
    );
  }

  let numeric;
  if (typeof value === "number") {
    numeric = value;
  } else if (typeof value === "string") {
    const cleaned = value.trim().replace(/,/g, "");
    if (cleaned.length === 0) {
      return fail(
        INVOICE_VALIDATION_REASONS.EMPTY,
        `${fieldName} must not be empty`
      );
    }
    numeric = Number(cleaned);
  } else {
    return fail(
      INVOICE_VALIDATION_REASONS.WRONG_TYPE,
      `${fieldName} must be a number or numeric string`
    );
  }

  if (!Number.isFinite(numeric)) {
    return fail(
      INVOICE_VALIDATION_REASONS.NOT_FINITE,
      `${fieldName} must be a finite number`
    );
  }
  if (numeric < 0) {
    return fail(
      INVOICE_VALIDATION_REASONS.OUT_OF_RANGE,
      `${fieldName} must not be negative`
    );
  }
  if (numeric > INVOICE_AMOUNT_MAX) {
    return fail(
      INVOICE_VALIDATION_REASONS.OUT_OF_RANGE,
      `${fieldName} exceeds the maximum allowed value`
    );
  }
  return ok(numeric);
}

/**
 * Validate a yield percentage.  Accepts numbers or numeric strings, optionally
 * suffixed with "%".  Rejects NaN, Infinity, negatives, and values above
 * INVOICE_YIELD_MAX.
 *
 * @param {*} value
 * @param {string} [fieldName]
 * @returns {ValidationResult}
 */
export function validateInvoiceYield(value, fieldName = "yield") {
  if (value === null || value === undefined) {
    return fail(
      INVOICE_VALIDATION_REASONS.MISSING,
      `${fieldName} is required`
    );
  }

  let numeric;
  if (typeof value === "number") {
    numeric = value;
  } else if (typeof value === "string") {
    const cleaned = value.trim().replace(/%$/, "").trim();
    if (cleaned.length === 0) {
      return fail(
        INVOICE_VALIDATION_REASONS.EMPTY,
        `${fieldName} must not be empty`
      );
    }
    numeric = Number(cleaned);
  } else {
    return fail(
      INVOICE_VALIDATION_REASONS.WRONG_TYPE,
      `${fieldName} must be a number or numeric string`
    );
  }

  if (!Number.isFinite(numeric)) {
    return fail(
      INVOICE_VALIDATION_REASONS.NOT_FINITE,
      `${fieldName} must be a finite number`
    );
  }
  if (numeric < 0) {
    return fail(
      INVOICE_VALIDATION_REASONS.OUT_OF_RANGE,
      `${fieldName} must not be negative`
    );
  }
  if (numeric > INVOICE_YIELD_MAX) {
    return fail(
      INVOICE_VALIDATION_REASONS.OUT_OF_RANGE,
      `${fieldName} exceeds the maximum allowed value`
    );
  }
  return ok(numeric);
}

/**
 * Validate an ISO 8601 date string (YYYY-MM-DD).  Rejects non-strings,
 * malformed strings, and calendar-invalid dates such as "2025-02-30".
 *
 * @param {*} value
 * @param {string} [fieldName]
 * @returns {ValidationResult}
 */
export function validateInvoiceDate(value, fieldName = "dueDate") {
  if (value === null || value === undefined) {
    return fail(
      INVOICE_VALIDATION_REASONS.MISSING,
      `${fieldName} is required`
    );
  }
  if (typeof value !== "string") {
    return fail(
      INVOICE_VALIDATION_REASONS.WRONG_TYPE,
      `${fieldName} must be a string`
    );
  }
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return fail(
      INVOICE_VALIDATION_REASONS.INVALID_DATE,
      `${fieldName} must be an ISO 8601 date (YYYY-MM-DD)`
    );
  }
  const [year, month, day] = trimmed.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return fail(
      INVOICE_VALIDATION_REASONS.INVALID_DATE,
      `${fieldName} is not a real calendar date`
    );
  }
  return ok(trimmed);
}

/**
 * Validate an invoice status against the canonical `INVOICE_STATUSES` enum.
 *
 * Boundary rules:
 *   - null / undefined             -> MISSING
 *   - non-string                    -> WRONG_TYPE (or EMPTY for "")
 *   - value not in INVOICE_STATUSES   -> INVALID_STATUS
 *
 * @param {*} value
 * @param {string} [fieldName]
 * @returns {ValidationResult}
 */
export function validateInvoiceStatus(value, fieldName = "status") {
  if (value === null || value === undefined) {
    return fail(
      INVOICE_VALIDATION_REASONS.MISSING,
      `${fieldName} is required`
    );
  }
  if (typeof value !== "string") {
    return fail(
      INVOICE_VALIDATION_REASONS.WRONG_TYPE,
      `${fieldName} must be a string`
    );
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return fail(
      INVOICE_VALIDATION_REASONS.EMPTY,
      `${fieldName} must not be empty`
    );
  }
  const valid = Object.values(INVOICE_STATUSES).includes(trimmed);
  if (!valid) {
    return fail(
      INVOICE_VALIDATION_REASONS.INVALID_STATUS,
      `${fieldName} must be one of ${Object.values(INVOICE_STATUSES).join(", ")}`
    );
  }
  return ok(trimmed);
}

/**
 * Validate a full invoice object.  Returns a normalised copy on success or a
 * list of field-level errors on failure.  This is the entry point consumed by
 * `app/invest/[id]/InvoiceDetailItems.jsx` and any other surface that
 * renders invoice details.
 *
 * @param {*} invoice
 * @returns {{ok: boolean, value?: Invoice, errors?: Array<{field: string, reason: string, message: string}>}}
 */
export function validateInvoice(invoice) {
  if (invoice === null || typeof invoice !== "object" || Array.isArray(invoice)) {
    return {
      ok: false,
      errors: [
        {
          field: "invoice",
          reason: INVOICE_VALIDATION_REASONS.WRONG_TYPE,
          message: "invoice must be an object",
        },
      ],
    };
  }

  const errors = [];
  const normalised = {};

  const idResult = validateInvoiceString(invoice.id, "id");
  if (idResult.ok) {
    normalised.id = idResult.value;
  } else {
    errors.push({ field: "id", reason: idResult.reason, message: idResult.message });
  }

  const issuerResult = validateInvoiceString(invoice.issuer, "issuer");
  if (issuerResult.ok) {
    normalised.issuer = issuerResult.value;
  } else {
    errors.push({ field: "issuer", reason: issuerResult.reason, message: issuerResult.message });
  }

  const amountResult = validateInvoiceAmount(invoice.amount, "amount");
  if (amountResult.ok) {
    normalised.amount = amountResult.value;
  } else {
    errors.push({ field: "amount", reason: amountResult.reason, message: amountResult.message });
  }

  const currencyResult = validateInvoiceString(invoice.currency, "currency");
  if (currencyResult.ok) {
    normalised.currency = currencyResult.value;
  } else {
    errors.push({ field: "currency", reason: currencyResult.reason, message: currencyResult.message });
  }

  const dateResult = validateInvoiceDate(invoice.dueDate, "dueDate");
  if (dateResult.ok) {
    normalised.dueDate = dateResult.value;
  } else {
    errors.push({ field: "dueDate", reason: dateResult.reason, message: dateResult.message });
  }

  const yieldResult = validateInvoiceYield(invoice.yield, "yield");
  if (yieldResult.ok) {
    normalised.yield = yieldResult.value;
  } else {
    errors.push({ field: "yield", reason: yieldResult.reason, message: yieldResult.message });
  }

  const statusResult = validateInvoiceStatus(invoice.status, "status");
  if (statusResult.ok) {
    normalised.status = statusResult.value;
  } else {
    errors.push({ field: "status", reason: statusResult.reason, message: statusResult.message });
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, value: normalised };
}

/**
 * Detect duplicate invoice identifiers in a collection.  Returns the list of
 * duplicate ids (in first-seen order) and the indexes of the duplicate entries.
 * This is the canonical guard for any surface that renders a list of invoice
 * line items, including `app/invest/[id]/InvoiceDetailItems.jsx`.
 *
 * @param {Array<{id?: *}>} items
 * @returns {duplicateIds: string[], duplicateIndexes: number[]}
 */
export function findDuplicateInvoiceIds(items) {
  if (!Array.isArray(items)) {
    return { duplicateIds: [], duplicateIndexes: [] };
  }

  const seen = new Map();
  const duplicateIds = [];
  const duplicateIndexes = [];

  items.forEach((item, index) => {
    const result = validateInvoiceString(item && item.id, "id");
    if (!result.ok) {
      return;
    }
    const key = result.value;
    if (seen.has(key)) {
      if (!duplicateIds.includes(key)) {
        duplicateIds.push(key);
      }
      duplicateIndexes.push(index);
    } else {
      seen.set(key, index);
    }
  });

  return { duplicateIds: duplicateIds, duplicateIndexes: duplicateIndexes };
}
