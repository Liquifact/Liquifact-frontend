import { bpsToPercent } from "../format.js";

/**
 * Pure tier-option logic for the yield tier selector.
 * No React, no network — importable by node --test directly.
 *
 * @param {object} params
 * @param {Array<{minLockSecs:number, yieldBps:number}>} params.tiers Contract tier table.
 * @param {number} params.baseYieldBps Escrow base yield when no lock is chosen.
 * @param {number} params.nowSec Current unix time (seconds).
 * @param {number} params.maturitySec Invoice maturity (unix seconds).
 * @returns {Array<{id:string, lockSecs:number, yieldBps:number, label:string, disabled:boolean, reason:string|null}>}
 */
export function tierOptions({ tiers, baseYieldBps, nowSec, maturitySec }) {
  const options = [
    {
      id: "base",
      lockSecs: 0,
      yieldBps: Number(baseYieldBps) || 0,
      label: `No lock (base ${bpsToPercent(baseYieldBps)})`,
      disabled: false,
      reason: null,
    },
  ];

  const sorted = [...(Array.isArray(tiers) ? tiers : [])].sort((a, b) => a.minLockSecs - b.minLockSecs);

  for (const tier of sorted) {
    const lockSecs = Number(tier.minLockSecs) || 0;
    const yieldBps = Number(tier.yieldBps) || 0;
    // The contract rejects a commitment whose end (now + lock) passes
    // maturity (CommitmentLockExceedsMaturity = 111). The exact boundary
    // now + lock == maturity is still allowed.
    const beyondMaturity = Number.isFinite(maturitySec) && Number.isFinite(nowSec) && nowSec + lockSecs > maturitySec;
    options.push({
      id: `lock-${lockSecs}`,
      lockSecs,
      yieldBps,
      label: `Lock ${formatLockLabel(lockSecs)} → ${bpsToPercent(yieldBps)}`,
      disabled: beyondMaturity,
      reason: beyondMaturity ? "Lock would end after the invoice matures" : null,
    });
  }

  return options;
}

/** "30 days", "90 days", "1 day", "12 hours"… from a lock length in seconds. */
export function formatLockLabel(secs) {
  const s = Number(secs) || 0;
  if (s === 0) return "no lock";
  if (s % 86400 === 0) {
    const days = s / 86400;
    return `${days} day${days === 1 ? "" : "s"}`;
  }
  if (s % 3600 === 0) {
    const hours = s / 3600;
    return `${hours} hour${hours === 1 ? "" : "s"}`;
  }
  const minutes = Math.round(s / 60);
  return `${minutes} minute${minutes === 1 ? "" : "s"}`;
}

/** Unix seconds at which a lock started at nowSec ends. */
export function lockEndsAt(nowSec, lockSecs) {
  return (Number(nowSec) || 0) + (Number(lockSecs) || 0);
}

/** "12 Jan 2027" for a unix-seconds timestamp (UTC). */
export function formatLockEndDate(unixSec) {
  const d = new Date((Number(unixSec) || 0) * 1000);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}
