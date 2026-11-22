/**
 * lib/yield.js
 *
 * Pure invoice yield helpers shared by the investor calculator and the
 * marketplace APR sort.
 *
 * Conventions:
 *   - Simple interest, ACT/365: a 500 bps invoice with 73 days left has an
 *     annualized rate of 5 * 365 / 73 ≈ 25.00% per year.
 *   - Money stays in BigInt minor units (7 decimals for Stellar assets) and is
 *     rounded half-up at the currency's smallest unit — never via floats.
 *   - `annualizedRate()` returns `null` whenever the rate is undefined (zero,
 *     negative or non-finite days, invalid yield). Callers render "not
 *     available" and the APR sort keeps those invoices last.
 */

import * as money from "./money.js";

const BPS_DENOMINATOR = 10000n;
const BPS_ROUNDING = BPS_DENOMINATOR / 2n;
const MS_PER_DAY = 86400000;

/**
 * Projected payout at maturity: principal + (principal × yieldBps / 10000),
 * rounded half-up to the currency's smallest unit.
 *
 * @param {{ amount: string | number, yieldBps: number, currency: string }} input
 * @returns {bigint} payout in minor units (e.g. stroops)
 */
export function expectedPayout({ amount, yieldBps, currency }) {
  const principal = money.parse(amount, currency);
  const bps = Number(yieldBps);
  if (!Number.isInteger(bps) || bps < 0) {
    throw new RangeError("yieldBps must be a non-negative integer");
  }
  const interest = (principal * BigInt(bps) + BPS_ROUNDING) / BPS_DENOMINATOR;
  return money.add(principal, interest);
}

/**
 * Whole days from `nowMs` to `dueDate`, counted between UTC calendar days.
 * Past-due dates (and today) return 0; unparsable dates also return 0 so the
 * UI never receives NaN.
 *
 * @param {string | number | Date} dueDate
 * @param {number} [nowMs] injectable clock for tests
 * @returns {number} non-negative whole days
 */
export function daysToDue(dueDate, nowMs = Date.now()) {
  const due = new Date(dueDate).getTime();
  if (!Number.isFinite(due) || !Number.isFinite(nowMs)) return 0;
  const days = Math.floor(due / MS_PER_DAY) - Math.floor(nowMs / MS_PER_DAY);
  return days > 0 ? days : 0;
}

/**
 * Simple annualized rate in percentage points (ACT/365):
 *   yieldBps / 100 * 365 / days
 *
 * Returns `null` when the rate is undefined: days <= 0 (past due / due today),
 * non-finite days, or an invalid yield. Never returns Infinity or NaN.
 *
 * @param {{ yieldBps: number, days: number }} input
 * @returns {number | null} percent per year, e.g. 40 for 40%
 */
export function annualizedRate({ yieldBps, days }) {
  const bps = Number(yieldBps);
  const tenor = Number(days);
  if (!Number.isFinite(bps) || bps < 0) return null;
  if (!Number.isFinite(tenor) || tenor <= 0) return null;
  return (bps / 100) * (365 / tenor);
}
