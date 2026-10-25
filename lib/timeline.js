/**
 * @file lib/timeline.js
 * Pure, deterministic functions for building an invoice lifecycle timeline.
 *
 * No React, no DOM — safe to import in any context including Node tests.
 *
 * Exported API:
 *   buildTimeline({ invoice, escrow?, nowMs }) → TimelineStep[]
 *   formatRelative(targetMs, nowMs) → string
 */

// Canonical display statuses. The API uses lowercase ("open"); normalise so
// both spellings map onto the same lifecycle (see normalizeStatus).
export const INVOICE_STATUSES = Object.freeze({
  OPEN: "Open",
  FUNDED: "Funded",
  SETTLED: "Settled",
  OVERDUE: "Overdue",
});

export function normalizeStatus(status) {
  const s = String(status ?? "").trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : "";
}

/**
 * @typedef {"done" | "current" | "upcoming" | "missed" | "terminal"} StepState
 *
 * @typedef {Object} TimelineStep
 * @property {string}    id     - Unique step identifier
 * @property {string}    label  - Human-readable step label
 * @property {Date|null} at     - UTC timestamp for this milestone (null if unknown)
 * @property {StepState} state  - Rendering state for this step
 */

/**
 * @typedef {Object} InvoiceInput
 * @property {string}  status    - One of INVOICE_STATUSES
 * @property {string}  [dueDate] - ISO 8601 date string (e.g. "2026-06-15")
 * @property {string}  [createdAt] - ISO 8601 date-time string from the backend
 */

/**
 * @typedef {Object} EscrowInput
 * @property {number} [funding_deadline] - Unix timestamp in seconds
 * @property {number} [maturity]         - Unix timestamp in seconds (on-chain maturity)
 * @property {number} [settled_at]       - Unix timestamp in seconds
 */

const MS_IN_DAY = 24 * 60 * 60 * 1000;

/**
 * Convert seconds → milliseconds (on-chain values are in seconds).
 * @param {number|null|undefined} seconds
 * @returns {number|null}
 */
function secToMs(seconds) {
  if (seconds == null || !isFinite(seconds)) return null;
  return seconds * 1000;
}

/**
 * Parse a date value to a Date object, returning null for invalid/missing input.
 * @param {string|number|Date|null|undefined} value
 * @returns {Date|null}
 */
function toDate(value) {
  if (value == null || value === "") return null;
  const d = value instanceof Date ? value : new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Returns how many full days an invoice is overdue (positive integer) or 0.
 * @param {Date} dueDate
 * @param {number} nowMs
 * @returns {number}
 */
function overduedays(dueDate, nowMs) {
  const diff = nowMs - dueDate.getTime();
  return diff > 0 ? Math.floor(diff / MS_IN_DAY) : 0;
}

/**
 * Build an ordered timeline of lifecycle steps for an invoice.
 *
 * Steps produced:
 *   listed → funding_deadline → funded → due/maturity → settled
 *
 * Terminal states (cancelled / withdrawn) produce a final terminal step.
 * Overdue conditions are reflected in the `state` of the due/maturity step.
 *
 * @param {Object} params
 * @param {InvoiceInput}    params.invoice - Invoice object from the API / mock
 * @param {EscrowInput|null|undefined} params.escrow - Optional on-chain escrow data
 * @param {number} params.nowMs            - Current timestamp in ms (for deterministic tests)
 * @returns {TimelineStep[]}
 */
export function buildTimeline({ invoice, escrow = null, nowMs }) {
  const status = normalizeStatus(invoice?.status);
  const isTerminal =
    status === "Cancelled" || status === "Withdrawn";

  // ── Derive timestamps ─────────────────────────────────────────────────────

  // "Listed" – createdAt from backend, or null for demo data
  const listedAt = toDate(invoice?.createdAt ?? null);

  // Funding deadline – prefer on-chain value, fall back to null
  const fundingDeadlineMs = escrow ? secToMs(escrow.funding_deadline) : null;
  const fundingDeadlineAt = fundingDeadlineMs != null ? new Date(fundingDeadlineMs) : null;

  // Due / maturity – prefer on-chain maturity (seconds → ms), fall back to dueDate string
  let dueAt = null;
  if (escrow?.maturity != null) {
    dueAt = toDate(secToMs(escrow.maturity));
  } else {
    dueAt = toDate(invoice?.dueDate ?? null);
  }

  // Settled – prefer on-chain settled_at, no string fallback
  const settledMs = escrow ? secToMs(escrow.settled_at) : null;
  const settledAt = settledMs != null ? new Date(settledMs) : null;

  // ── Classify step states ──────────────────────────────────────────────────

  const isOpen = status === INVOICE_STATUSES.OPEN;
  const isFunded = status === INVOICE_STATUSES.FUNDED;
  const isSettled = status === INVOICE_STATUSES.SETTLED;
  const isOverdue = status === INVOICE_STATUSES.OVERDUE;

  // Funding deadline missed: the deadline has passed and the invoice is still Open
  const fundingDeadlineMissed =
    fundingDeadlineAt != null && isOpen && fundingDeadlineAt.getTime() < nowMs;

  // Due-date overdue: dueDate has passed but invoice is not yet settled
  const dueDateOverdue =
    dueAt != null &&
    (isOpen || isFunded || isOverdue) &&
    dueAt.getTime() < nowMs;

  const daysOverdue = dueDateOverdue && dueAt ? overduedays(dueAt, nowMs) : 0;

  // ── Build steps ───────────────────────────────────────────────────────────

  /** @type {TimelineStep[]} */
  const steps = [];

  // 1. Listed
  steps.push({
    id: "listed",
    label: "Listed",
    at: listedAt,
    state: isTerminal
      ? "done"
      : isOpen && !fundingDeadlineMissed && !dueDateOverdue
        ? "current"
        : "done",
  });

  // 2. Funding deadline
  if (fundingDeadlineAt != null || isFunded || isSettled || isOverdue) {
    let fdState;
    if (isTerminal) {
      fdState = fundingDeadlineMissed ? "missed" : "upcoming";
    } else if (fundingDeadlineMissed) {
      fdState = "missed";
    } else if (isOpen) {
      fdState = fundingDeadlineAt != null ? "current" : "upcoming";
    } else {
      // funded / settled / overdue — deadline has passed (or is irrelevant)
      fdState = "done";
    }

    steps.push({
      id: "funding_deadline",
      label: "Funding deadline",
      at: fundingDeadlineAt,
      state: fdState,
    });
  }

  // 3. Funded
  const fundedState = (() => {
    if (isTerminal) return "upcoming";
    if (isSettled || isOverdue) return "done";
    if (isFunded) return "current";
    // Open but funding deadline missed → we still show as upcoming
    return "upcoming";
  })();

  steps.push({
    id: "funded",
    label: "Funded",
    at: null, // No explicit timestamp for the funding event in current API
    state: fundedState,
  });

  // 4. Due / Maturity
  const dueLabel = daysOverdue > 0
    ? `Overdue by ${daysOverdue} day${daysOverdue === 1 ? "" : "s"}`
    : "Due / Maturity";

  const dueState = (() => {
    if (isTerminal) return "upcoming";
    if (isSettled) return "done";
    if (dueDateOverdue) return "missed";
    if (isFunded && dueAt != null) return "current";
    if (isOpen && dueAt != null) return "upcoming";
    return "upcoming";
  })();

  steps.push({
    id: "due",
    label: dueLabel,
    at: dueAt,
    state: dueState,
  });

  // 5. Settled
  steps.push({
    id: "settled",
    label: "Settled",
    at: settledAt,
    state: isSettled ? "current" : "upcoming",
  });

  // 6. Terminal step (Cancelled / Withdrawn)
  if (isTerminal) {
    steps.push({
      id: "terminal",
      label: status, // "Cancelled" or "Withdrawn"
      at: null,
      state: "terminal",
    });
  }

  return steps;
}

/**
 * Format a relative time string using Intl.RelativeTimeFormat.
 *
 * Produces deterministic output for the given target and now values —
 * safe to use in unit tests and SSR as long as the locale is fixed.
 *
 * @param {number} targetMs - The target time in milliseconds
 * @param {number} nowMs    - "Now" in milliseconds (for deterministic tests)
 * @param {string} [locale="en"] - BCP 47 locale tag
 * @returns {string} Relative time string, e.g. "in 3 days", "2 hours ago"
 */
export function formatRelative(targetMs, nowMs, locale = "en") {
  const diffMs = targetMs - nowMs;
  const absMs = Math.abs(diffMs);
  const sign = diffMs >= 0 ? 1 : -1; // positive = future

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  const SECOND = 1000;
  const MINUTE = 60 * SECOND;
  const HOUR = 60 * MINUTE;
  const DAY = 24 * HOUR;
  const WEEK = 7 * DAY;
  const MONTH = 30 * DAY;
  const YEAR = 365 * DAY;

  let value;
  let unit;

  if (absMs < MINUTE) {
    value = Math.round(absMs / SECOND);
    unit = "second";
  } else if (absMs < HOUR) {
    value = Math.round(absMs / MINUTE);
    unit = "minute";
  } else if (absMs < DAY) {
    value = Math.round(absMs / HOUR);
    unit = "hour";
  } else if (absMs < WEEK) {
    value = Math.round(absMs / DAY);
    unit = "day";
  } else if (absMs < MONTH) {
    value = Math.round(absMs / WEEK);
    unit = "week";
  } else if (absMs < YEAR) {
    value = Math.round(absMs / MONTH);
    unit = "month";
  } else {
    value = Math.round(absMs / YEAR);
    unit = "year";
  }

  return rtf.format(sign * value, unit);
}
