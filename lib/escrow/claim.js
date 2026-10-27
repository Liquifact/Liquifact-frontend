// Investor payout claim after settlement (#1367).
//
// Entrypoints (escrow contract):
//   get_claimable_payout(investor: Address) -> i128
//   is_investor_claimed(investor: Address) -> bool
//   get_investor_claim_not_before(investor: Address) -> u64   (unix seconds, 0 = no lock)
//   get_legal_hold() -> bool
//   is_paused() -> bool
//   get_escrow() -> InvoiceEscrow { status: u32, ... }   (2 = settled)
//   claim_investor_payout(investor: Address)
//
// The payout itself is computed by the contract (compute_investor_payout);
// this module only displays the contract's number, it never recomputes it.
import { CONTRACT_ID } from "../config.js";
import { addressArg } from "../stellar/rpc.js";
import { simulateRead } from "../stellar/simulate.js";

export const STATUS_SETTLED = 2;

/**
 * Read everything the claim UI needs for `investor`.
 * @param {string} investor - connected wallet address (G...)
 * @param {{ contractId?: string, read?: typeof simulateRead }} [options]
 */
export async function loadClaimState(investor, { contractId = CONTRACT_ID, read = simulateRead } = {}) {
  const call = (method, args = []) => read(contractId, method, args);
  const investorArg = [addressArg(investor)];
  const [amount, claimed, notBefore, legalHold, paused, escrow] = await Promise.all([
    call("get_claimable_payout", investorArg),
    call("is_investor_claimed", investorArg),
    call("get_investor_claim_not_before", investorArg),
    call("get_legal_hold"),
    call("is_paused"),
    call("get_escrow"),
  ]);
  return {
    status: Number(escrow?.status ?? -1),
    amount: BigInt(amount ?? 0),
    claimed: Boolean(claimed),
    unlockAt: Number(notBefore ?? 0),
    legalHold: Boolean(legalHold),
    paused: Boolean(paused),
  };
}

/**
 * Decide which claim UI to show. Pure: same state and clock, same answer.
 *
 * @param {{ status: number, amount: bigint, claimed: boolean, unlockAt: number,
 *           legalHold: boolean, paused: boolean }} state
 * @param {number} nowSec - current unix time in seconds
 * @returns {{ kind: "claimable"|"claimed"|"locked"|"blocked"|"not-settled"|"nothing",
 *             amount: bigint, unlockAt: number|null, reason: string|null }}
 */
export function deriveClaimUi(state, nowSec) {
  const amount = BigInt(state?.amount ?? 0);
  const result = (kind, extra = {}) => ({ kind, amount, unlockAt: null, reason: null, ...extra });

  if (state?.status !== STATUS_SETTLED) return result("not-settled");
  if (state.claimed) return result("claimed");
  if (amount <= 0n) return result("nothing");
  if (state.legalHold) {
    return result("blocked", { reason: "A legal hold is active on this escrow, so payouts are blocked." });
  }
  if (state.paused) {
    return result("blocked", { reason: "The escrow is paused, so payouts are temporarily unavailable." });
  }
  if (state.unlockAt > 0 && nowSec < state.unlockAt) {
    return result("locked", { unlockAt: state.unlockAt });
  }
  return result("claimable");
}

/** ScVal arguments for `claim_investor_payout(investor)`. */
export function buildClaimArgs(investor) {
  return [addressArg(investor)];
}

/** "1d 2h 3m" style countdown; "less than a minute" under 60 s. */
export function formatCountdown(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  if (s < 60) return "less than a minute";
  const days = Math.floor(s / 86_400);
  const hours = Math.floor((s % 86_400) / 3_600);
  const minutes = Math.floor((s % 3_600) / 60);
  return [days && `${days}d`, hours && `${hours}h`, minutes && `${minutes}m`].filter(Boolean).join(" ");
}
