/**
 * Pure portfolio summary logic.
 *
 * Takes a list of positions (see lib/portfolio/sources.js) and produces aggregate
 * statistics for the dashboard. All arithmetic is per-currency: we never sum
 * across currencies.
 *
 * A Position is expected to look like:
 *   {
 *     invoiceId: string,
 *     currency: string,
 *     amount: number,            // principal invested
 *     yieldBps: number,          // coupon in basis-points (flat)
 *     status: string,            // 'active' | 'settled' | 'claimed' | 'defaulted'
 *     dueAt?: number | string,     // optional maturity timestamp
 *     claimable?: number,        // optional claimable payout
 *     source?: string,
 *   }
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MATURITY_WINDOW_DAYS = 30;

/** Normalise a due value (timestamp ms or ISO string) to a number or null. */
function toTimeMs(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Coerce a value to a finite non-negative number. */
function toAmount(value) {
  const n = typeof value === "string" ? Number.parseFloat(value) : value;
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

/** Coerce a yield value to a finite non-negative bps integer. */
function toBps(value) {
  const n = typeof value === "string" ? Number.parseFloat(value) : value;
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n);
}

/** Normalise a status string to a known bucket. */
function normaliseStatus(status) {
  const s = typeof status === "string" ? status.trim().toLowerCase() : "";
  if (s === "active" || s === "open" || s === "funding") return "active";
  if (s === "settled" || s === "repaid" || s === "complete") return "settled";
  if (s === "claimed") return "claimed";
  if (s === "defaulted" || s === "default") return "defaulted";
  return s || "unknown";
}

/**
 * Compute the flat coupon for a principal at a given yield in bps.
 * The coupon is floored to two decimal places so that projected payouts never
 * overstate the amount owed.
 */
export function projectedCoupon(amount, yieldBps) {
  const principal = toAmount(amount);
  const bps = toBps(yieldBps);
  if (principal === 0 || bps === 0) return 0;
  const raw = (principal * bps) / 10000;
  // Floor to two decimal places to avoid floating-point overstatement.
  return Math.floor(raw * 100 + 1e-8) / 100;
}

/** Projected payout = principal + floored coupon. */
export function projectedPayout(amount, yieldBps) {
  return toAmount(amount) + projectedCoupon(amount, yieldBps);
}

/**
 * Summarise a list of positions.
 *
 * @param {Array<object>} positions
 * @param {number} [nowMs=Date.now()]
 * @returns {object}
 */
export function summarise(positions, nowMs = Date.now()) {
  const list = Array.isArray(positions) ? positions : [];
  const now = Number.isFinite(nowMs) ? nowMs : Date.now();
  const windowEnd = now + MATURITY_WINDOW_DAYS * MS_PER_DAY;

  // Per-currency accumulators.
  const byCurrency = new Map();
  const countsByStatus = {};
  const upcomingMaturities = [];
  let claimableTotal = 0;
  const claimableByCurrency = new Map();

  for (const position of list) {
    if (!position || typeof position !== "object") continue;
    const currency = (position.currency || "USDC").toUpperCase();
    const amount = toAmount(position.amount);
    const yieldBps = toBps(position.yieldBps);
    const status = normaliseStatus(position.status);
    const coupon = projectedCoupon(amount, yieldBps);
    const payout = amount + coupon;
    const claimable = toAmount(position.claimable);

    countsByStatus[status] = (countsByStatus[status] || 0) + 1;

    if (!byCurrency.has(currency)) {
      byCurrency.set(currency, {
        currency,
        count: 0,
        invested: 0,
        projectedCoupon: 0,
        projectedPayout: 0,
        claimable: 0,
        // Weighted yield accumulators.
        weightedYield: 0,
        weightSum: 0,
      });
    }
    const bucket = byCurrency.get(currency);
    bucket.count += 1;
    bucket.invested += amount;
    bucket.projectedCoupon += coupon;
    bucket.projectedPayout += payout;
    bucket.claimable += claimable;
    bucket.weightedYield += yieldBps * amount;
    bucket.weightSum += amount;

    if (claimable > 0) {
      claimableTotal += claimable;
      claimableByCurrency.set(
        currency,
        (claimableByCurrency.get(currency) || 0) + claimable
      );
    }

    const dueAt = toTimeMs(position.dueAt);
    if (dueAt !== null && dueAt >= now && dueAt <= windowEnd) {
      upcomingMaturities.push({
        invoiceId: position.invoiceId,
        currency,
        amount,
        projectedPayout: payout,
        dueAt,
      });
    }
  }

  // Finalise per-currency buckets and round to avoid floating-point dust.
  const totalsByCurrency = [];
  for (const bucket of byCurrency.values()) {
    const avgYieldBps =
      bucket.weightSum > 0 ? bucket.weightedYield / bucket.weightSum : 0;
    totalsByCurrency.push({
      currency: bucket.currency,
      count: bucket.count,
      invested: round2(bucket.invested),
      projectedCoupon: round2(bucket.projectedCoupon),
      projectedPayout: round2(bucket.projectedPayout),
      claimable: round2(bucket.claimable),
      avgYieldBps: Math.round(avgYieldBps),
    });
  }
  totalsByCurrency.sort((a, b) => a.currency.localeCompare(b.currency));

  upcomingMaturities.sort((a, b) => a.dueAt - b.dueAt);

  const claimableByCurrencyList = Array.from(claimableByCurrency.entries())
    .map(([currency, amount]) => ({ currency, amount: round2(amount) }))
    .sort((a, b) => a.currency.localeCompare(b.currency));

  return {
    count: list.length,
    totalsByCurrency,
    countsByStatus,
    upcomingMaturities,
    claimableTotal: round2(claimableTotal),
    claimableByCurrency: claimableByCurrencyList,
  };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

export const MATURITY_WINDOW_MS = MATURITY_WINDOW_DAYS * MS_PER_DAY;
