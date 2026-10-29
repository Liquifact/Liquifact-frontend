// Read-only Soroban helpers for the escrow yield-tier system.
// Mirrors the pattern in rpc.js: thin wrappers around simulateCall that
// accept an injected `call` for tests so no network is needed.

import { nativeToScVal } from "@stellar/stellar-sdk";
import { CONTRACT_ID } from "../config.js";
import { simulateCall, addressArg, i128Arg } from "./rpc.js";

/** Build a u64 argument from a BigInt / number / numeric string. */
export const u64Arg = (value) => nativeToScVal(BigInt(value), { type: "u64" });

/**
 * Normalise a raw tier returned by `scValToNative` into a plain object.
 * Handles both snake_case and camelCase field names.
 *
 * @param {object} raw
 * @returns {{min_lock_secs:number, yield_bps:number}}
 */
function normaliseTier(raw) {
  if (raw == null) return { min_lock_secs: 0, yield_bps: 0 };
  const minLock = raw.min_lock_secs ?? raw.minLockSecs ?? raw.min_lock ?? raw.minLock ?? 0;
  const yieldBps = raw.yield_bps ?? raw.yieldBps ?? raw.yield ?? 0;
  return { min_lock_secs: Number(minLock), yield_bps: Number(yieldBps) };
}

/**
 * Read the escrow's yield-tier table.
 *
 * Calls `get_yield_tiers` (returns the full Vec<YieldTier>) and normalises
 * each entry.  Returns an empty array when the contract has no tiers
 * configured or the call fails.
 *
 * @param {object} opts
 * @param {string} [opts.contractId] - defaults to the configured escrow
 * @param {function} [opts.call] - injected simulate helper (tests)
 * @returns {Promise<Array<{min_lock_secs:number, yield_bps:number}>>}
 */
export async function fetchYieldTiers({ contractId = CONTRACT_ID, call = simulateCall } = {}) {
  let raw;
  try {
    raw = await call({ contractId, method: "get_yield_tiers" });
  } catch {
    // The deployed wasm may not expose the entrypoint at all.
    return [];
  }
  if (!Array.isArray(raw)) return [];
  return raw.map(normaliseTier);
}

/**
 * Simulate `preview_yield_tier(amount, lock)` and decode the YieldResolution.
 *
 * The contract entrypoint takes two args: i128 amount and u64 lock duration.
 * It returns a YieldResolution with the effective yield and lock-end timestamp.
 *
 * @param {object} opts
 * @param {string} [opts.contractId]
 * @param {bigint} opts.amountStroops - contribution amount in stroops (i128)
 * @param {number|bigint} opts.lockSecs - lock duration in seconds (u64)
 * @param {function} [opts.call] - injected simulate helper (tests)
 * @returns {Promise<{effective_yield_bps:number, lock_end_secs:number}>}
 */
export async function previewYieldTier({ contractId = CONTRACT_ID, amountStroops, lockSecs, call = simulateCall } = {}) {
  const args = [i128Arg(amountStroops), u64Arg(lockSecs)];
  const raw = await call({ contractId, method: "preview_yield_tier", args });
  const effectiveBps = Number(raw?.effective_yield_bps ?? raw?.effectiveYieldBps ?? raw?.yield_bps ?? raw?.yieldBps ?? 0);
  const lockEnd = Number(raw?.lock_end_secs ?? raw?.lockEndSecs ?? raw?.lock_end ?? raw?.lockEnd ?? 0);
  return { effective_yield_bps: effectiveBps, lock_end_secs: lockEnd };
}

/**
 * Read the yield that was fixed for an investor at their first deposit.
 * Calls `get_investor_yield_bps(investor)` → u32.  Returns null on error.
 *
 * @param {object} opts
 * @param {string} [opts.contractId]
 * @param {string} opts.investor - investor G-address
 * @param {function} [opts.call] - injected simulate helper (tests)
 * @returns {Promise<number|null>}
 */
export async function fetchInvestorYieldBps({ contractId = CONTRACT_ID, investor, call = simulateCall } = {}) {
  try {
    return Number(await call({ contractId, method: "get_investor_yield_bps", args: [addressArg(investor)] }));
  } catch {
    return null;
  }
}

/**
 * Read the investor's contribution on a specific escrow contract.
 * Reuses the same `get_contribution` entrypoint but accepts an explicit
 * contractId so multi-escrow deployments work.
 *
 * @param {object} opts
 * @param {string} [opts.contractId]
 * @param {string} opts.investor
 * @param {function} [opts.call]
 * @returns {Promise<bigint>}
 */
export async function fetchContributionFor({ contractId = CONTRACT_ID, investor, call = simulateCall } = {}) {
  try {
    return BigInt((await call({ contractId, method: "get_contribution", args: [addressArg(investor)] })) ?? 0);
  } catch {
    return 0n;
  }
}
