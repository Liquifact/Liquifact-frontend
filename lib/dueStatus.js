/**
 * @file lib/dueStatus.js
 * Pure due-date countdown / overdue classification for invoices.
 *
 * All comparisons are made on UTC calendar days so a date-only due date such
 * as "2026-12-01" means the same day for every viewer regardless of timezone.
 * No React, no DOM — safe to import from node:test.
 */

import { normalizeStatus } from "./timeline.js";

/** Invoices due within this many days (inclusive) are flagged "due-soon". */
export const DUE_SOON_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const CLOSED_STATUSES = new Set(["Settled", "Cancelled", "Withdrawn"]);

/**
 * UTC midnight (ms) of the calendar day a due date falls on, or NaN.
 * Date-only strings are parsed as UTC dates (never local time); timestamps
 * and Date objects use the UTC day of that instant.
 */
export function utcDayMs(value) {
  if (value === null || value === undefined || value === "") return NaN;
  if (typeof value === "string") {
    const m = DATE_ONLY.exec(value.trim());
    if (m) {
      const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
      const ms = Date.UTC(y, mo - 1, d);
      const check = new Date(ms);
      // Reject rollovers such as 2026-02-30.
      return check.getUTCFullYear() === y && check.getUTCMonth() === mo - 1 && check.getUTCDate() === d ? ms : NaN;
    }
  }
  const t = value instanceof Date ? value.getTime() : new Date(value).getTime();
  if (!Number.isFinite(t)) return NaN;
  const d = new Date(t);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/**
 * @typedef {Object} DueStatus
 * @property {"overdue"|"due-soon"|"ok"|"closed"} kind
 * @property {number|null} days - whole UTC days until due (due-soon / ok,
 *   0 = due today) or days past due (overdue, >= 1); null when closed.
 */

/**
 * Classify an invoice's due date relative to `nowMs`.
 *
 * - closed:   settled, cancelled or withdrawn — no countdown is shown
 * - overdue:  due date is before today (UTC)
 * - due-soon: due today or within DUE_SOON_DAYS days
 * - ok:       due later than that
 *
 * @param {{ status?: string, dueDate?: string|number|Date }} invoice
 * @param {number} [nowMs=Date.now()]
 * @returns {DueStatus|null} null when the invoice has no valid due date.
 */
export function dueStatus(invoice, nowMs = Date.now()) {
  if (!invoice) return null;
  if (CLOSED_STATUSES.has(normalizeStatus(invoice.status))) return { kind: "closed", days: null };
  const dueDay = utcDayMs(invoice.dueDate);
  const today = utcDayMs(nowMs);
  if (!Number.isFinite(dueDay) || !Number.isFinite(today)) return null;
  const diff = Math.round((dueDay - today) / DAY_MS);
  if (diff < 0) return { kind: "overdue", days: -diff };
  if (diff <= DUE_SOON_DAYS) return { kind: "due-soon", days: diff };
  return { kind: "ok", days: diff };
}
