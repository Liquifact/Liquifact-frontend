/**
 * Investment return maths for invoice funding.
 *
 * The escrow pays a **flat coupon for the invoice term**, not an annual rate:
 *
 *     coupon   = floor(funded_amount * yield_bps / 10_000)
 *     payout   = funded_amount + coupon
 *
 * Computing in integers (stroops, 7 decimals) avoids binary floating-point
 * drift and mirrors the contract's floor division exactly. The implied
 * annualised rate is derived only for display, so investors can compare a
 * 60-day invoice with a 365-day one on the same footing.
 */

export const STROOPS_PER_UNIT = 10_000_000n;
export const BPS_DENOMINATOR = 10_000n;
export const DAYS_PER_YEAR = 365n;
export const MS_PER_DAY = 86_400_000;

/**
 * Parse a human decimal amount ("100", "100.5") into integer stroops.
 * Returns `null` for empty, negative or malformed input.
 */
export function parseUnitsToStroops(value) {
  const text = String(value ?? "").trim();
  if (!/^\d*(\.\d*)?$/.test(text) || text === "" || text === ".") {
    return null;
  }
  const [whole = "", fraction = ""] = text.split(".");
  const padded = (fraction + "0000000").slice(0, 7);
  return BigInt(whole || "0") * STROOPS_PER_UNIT + BigInt(padded || "0");
}

/** Convert integer stroops back to a display number of units. */
export function stroopsToNumber(stroops) {
  return Number(stroops) / Number(STROOPS_PER_UNIT);
}

/** Whole days from `now` until `dueDate`, rounded up; 0 once the due date has passed. */
export function termDays(dueDate, now = new Date()) {
  const due = new Date(dueDate).getTime();
  const current = new Date(now).getTime();
  if (!Number.isFinite(due) || !Number.isFinite(current)) return 0;
  return Math.max(0, Math.ceil((due - current) / MS_PER_DAY));
}

/** Format an implied annualised rate (in bps) as a percentage string. */
export function formatAnnualisedRate(bps) {
  return `${(Number(bps) / 100).toFixed(2)}%`;
}

/**
 * Compute settlement figures for a contribution.
 *
 * @param {object} input
 * @param {bigint|number|string} input.fundedStroops contribution in stroops
 * @param {number|string} input.yieldBps flat coupon in basis points
 * @param {string|Date} input.dueDate invoice due date
 * @param {Date} [input.now] reference time (injectable for tests)
 */
export function computeReturn({ fundedStroops, yieldBps, dueDate, now = new Date() }) {
  const funded = typeof fundedStroops === "bigint" ? fundedStroops : BigInt(fundedStroops || 0);
  const bps = BigInt(Math.trunc(Number(yieldBps) || 0));
  const coupon = funded > 0n && bps > 0n ? (funded * bps) / BPS_DENOMINATOR : 0n;
  const payout = funded + coupon;
  const days = termDays(dueDate, now);
  const annualisedBps =
    days > 0 && funded > 0n
      ? (coupon * BPS_DENOMINATOR * DAYS_PER_YEAR) / (funded * BigInt(days))
      : 0n;

  return {
    fundedStroops: funded,
    couponStroops: coupon,
    payoutStroops: payout,
    termDays: days,
    annualisedBps,
  };
}
