import {
  Account,
  Address,
  BASE_FEE,
  Contract,
  Keypair,
  TransactionBuilder,
  nativeToScVal,
  scValToNative,
  xdr,
} from "@stellar/stellar-sdk";
import { rpcRequest } from "./rpc.js";
import { NETWORK_PASSPHRASE, RPC_URL, SIMULATION_SOURCE } from "./network.js";

/**
 * Simulate a read-only contract call over Soroban RPC.
 * The transaction is built with a throwaway source account — nothing is
 * signed or submitted. Supports AbortSignal for stale-request cancellation.
 *
 * Returns the native-decoded ScVal result.
 */
export async function simulateContractCall({ contractId, method, args = [], rpcUrl = RPC_URL, signal } = {}) {
  const source = new Account(SIMULATION_SOURCE, "0");
  const contract = new Contract(contractId);
  const tx = new TransactionBuilder(source, { fee: BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE })
    .addOperation(contract.call(method, ...args))
    .setTimeout(0)
    .build();

  const result = await rpcRequest("simulateTransaction", [{ transaction: tx.toXDR() }], { rpcUrl, signal });
  if (result?.error) {
    const err = new Error(result.error);
    err.code = result.errorCode;
    throw err;
  }
  const raw = result?.results?.[0]?.xdr;
  if (!raw) return null;
  return scValToNative(xdr.ScVal.fromXDR(raw, "base64"));
}

/** Page size used when reading tiers via get_yield_tiers_page. */
export const TIER_PAGE_SIZE = 50;

/**
 * Read the escrow's yield tier table.
 * Prefers get_yield_tiers; falls back to get_yield_tiers_page if the
 * unpaged call fails (large tables).
 * Returns [{ minLockSecs: number, yieldBps: number }].
 */
export async function getYieldTiers({ contractId, rpcUrl = RPC_URL, signal, pageSize = TIER_PAGE_SIZE } = {}) {
  try {
    const tiers = await simulateContractCall({ contractId, method: "get_yield_tiers", rpcUrl, signal });
    return normalizeTiers(tiers);
  } catch (err) {
    if (signal?.aborted) throw err;
  }
  const tiers = [];
  for (let start = 0; ; start += pageSize) {
    const page = await simulateContractCall({
      contractId,
      method: "get_yield_tiers_page",
      args: [nativeToScVal(start, { type: "u32" }), nativeToScVal(pageSize, { type: "u32" })],
      rpcUrl,
      signal,
    });
    const normalized = normalizeTiers(page);
    tiers.push(...normalized);
    if (normalized.length < pageSize) break;
  }
  return tiers;
}

/** Normalize contract YieldTier structs into plain camelCase numbers. */
export function normalizeTiers(tiers) {
  if (!Array.isArray(tiers)) return [];
  return tiers
    .map((t) => ({
      minLockSecs: Number(t.min_lock_secs ?? t.minLockSecs ?? 0),
      yieldBps: Number(t.yield_bps ?? t.yieldBps ?? 0),
    }))
    .filter((t) => Number.isFinite(t.minLockSecs) && Number.isFinite(t.yieldBps));
}

/** The investor's current contribution (i128 stroops), 0n for first-timers. */
export async function getContribution({ contractId, investor, rpcUrl = RPC_URL, signal } = {}) {
  const res = await simulateContractCall({
    contractId,
    method: "get_contribution",
    args: [new Address(investor).toScVal()],
    rpcUrl,
    signal,
  });
  return BigInt(res ?? 0);
}

/**
 * Contract-quoted yield for (amount, lock).
 * Returns { effectiveYieldBps: number, matchedLockSecs: number }.
 */
export async function previewYieldTier({ contractId, amountStroops, lockSecs = 0, rpcUrl = RPC_URL, signal } = {}) {
  const res = await simulateContractCall({
    contractId,
    method: "preview_yield_tier",
    args: [nativeToScVal(BigInt(amountStroops), { type: "i128" }), nativeToScVal(BigInt(Math.trunc(lockSecs)), { type: "u64" })],
    rpcUrl,
    signal,
  });
  if (!res) throw new Error("Contract returned no quote.");
  const effectiveYieldBps = Number(res.effective_yield_bps ?? res.effectiveYieldBps ?? 0);
  const matchedLockSecs = Number(res.matched_lock_secs ?? res.matchedLockSecs ?? 0);
  if (!Number.isFinite(effectiveYieldBps)) throw new Error("Contract returned an invalid quote.");
  return { effectiveYieldBps, matchedLockSecs };
}

/** The investor's locked-in yield bps (get_investor_yield_bps). */
export async function getInvestorYieldBps({ contractId, investor, rpcUrl = RPC_URL, signal } = {}) {
  const res = await simulateContractCall({
    contractId,
    method: "get_investor_yield_bps",
    args: [new Address(investor).toScVal()],
    rpcUrl,
    signal,
  });
  return Number(res ?? 0);
}

/** Read escrow maturity (unix seconds) and base yield bps from get_escrow. */
export async function getEscrowInfo({ contractId, rpcUrl = RPC_URL, signal } = {}) {
  const res = await simulateContractCall({ contractId, method: "get_escrow", rpcUrl, signal });
  if (!res) return null;
  const maturitySec = Number(res.maturity ?? 0);
  const yieldBps = Number(res.yield_bps ?? 0);
  return {
    maturitySec: Number.isFinite(maturitySec) ? maturitySec : 0,
    baseYieldBps: Number.isFinite(yieldBps) ? yieldBps : 0,
  };
}

/** Convenience: Keypair helper for local testing (not used in the app path). */
export function randomAccount() {
  return Keypair.random();
}
