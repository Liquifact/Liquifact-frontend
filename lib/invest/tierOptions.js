// Pure logic for building the investor's yield-tier option list.
// No network calls, no React — safe to unit-test with node:test.
import { bpsToPercent } from "../format.js";

const SECONDS_PER_DAY = 86400;

/**
 * Format a lock duration (seconds) as a human-readable duration string.
 * Rounds to the nearest whole day.  e.g. 2_592_000 → "30 days".
 *
 * @param {number} lockSecs - lock duration in seconds
 * @returns {string}
 */
export function formatLockDuration(lockSecs) {
  const days = Math.round(Number(lockSecs) / SECONDS_PER_DAY);
  if (days <= 0) return "0 days";
  return `${days} ${days === 1 ? "day" : "days"}`;
}

/**
 * Build the list of yield-tier options for the investor to choose from.
 *
 * The first option is always the base (no-lock) yield.  Each on-chain tier
 * follows, preserving the order returned by the contract.  Tiers whose
 * lock would push past the invoice maturity are marked `disabled` with a
 * reason — the boundary `now + lock == maturity` is still allowed.
 *
 * @param {object} params
 * @param {Array<{min_lock_secs:number, yield_bps:number}>} [params.tiers]
 *   On-chain tier table from `get_yield_tiers` (may be null/empty).
 * @param {number} params.baseYieldBps
 *   The invoice's base yield in basis points (e.g. 800 → 8.00 %).
 * @param {number} params.nowSec
 *   Current time in epoch seconds.
 * @param {number} [params.maturitySec]
 *   Invoice maturity timestamp in epoch seconds (null when unknown).
 * @returns {Array<{
 *   lockSecs:number, yieldBps:number, label:string,
 *   disabled:boolean, reason:string|null
 * }>}
 */
export function tierOptions({ tiers, baseYieldBps, nowSec, maturitySec }) {
  const base = Number(baseYieldBps) || 0;
  const now = Number(nowSec) || 0;
  const maturity = maturitySec != null ? Number(maturitySec) : null;

  const options = [
    {
      lockSecs: 0,
      yieldBps: base,
      label: `No lock (base ${bpsToPercent(base)})`,
      disabled: false,
      reason: null,
    },
  ];

  for (const tier of tiers ?? []) {
    const lockSecs = Number(tier.min_lock_secs ?? tier.minLockSecs ?? 0);
    const yieldBps = Number(tier.yield_bps ?? tier.yieldBps ?? 0);

    // now + lock must not exceed maturity (CommitmentLockExceedsMaturity = 111).
    // The boundary now + lock == maturity is allowed (not disabled).
    const exceedsMaturity =
      maturity !== null && now + lockSecs > maturity;

    options.push({
      lockSecs,
      yieldBps,
      label: `Lock ${formatLockDuration(lockSecs)} \u2192 ${bpsToPercent(yieldBps)}`,
      disabled: exceedsMaturity,
      reason: exceedsMaturity ? "Lock would exceed invoice maturity" : null,
    });
  }

  return options;
}

/**
 * Decide whether the investor should see the tier selector at all.
 *
 * Returns true only when the contract has a non-empty tier table AND the
 * investor has no prior contribution (first deposit only — the tier choice
 * is immutable per TieredSecondDeposit = 108).
 *
 * @param {Array|null|undefined} tiers
 * @param {bigint} contribution
 * @returns {boolean}
 */
export function shouldShowTierSelector(tiers, contribution) {
  return Array.isArray(tiers) && tiers.length > 0 && BigInt(contribution ?? 0n) === 0n;
}
