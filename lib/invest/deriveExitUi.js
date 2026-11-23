/**
 * deriveExitUi — pure function that decides which investor-exit UI to show.
 *
 * All inputs come from on-chain reads; no API data is trusted for amounts.
 *
 * @param {object} params
 * @param {number}  params.status       - Escrow status integer (0=open, 4=cancelled)
 * @param {bigint}  params.contribution - Investor's contribution in stroops (from get_contribution)
 * @param {boolean} params.refunded     - Whether investor already refunded (from is_investor_refunded)
 * @param {boolean} params.legalHold    - Whether legal hold is active (from get_legal_hold)
 * @param {boolean} params.paused       - Whether escrow is paused (from is_paused)
 *
 * @returns {{ mode: "refund"|"unfund"|"none", maxStroops: bigint, reason: string|null }}
 */
export function deriveExitUi({ status, contribution, refunded, legalHold, paused }) {
  const contrib = BigInt(contribution ?? 0n);

  // ── Cancelled (status 4): refund path ────────────────────────────────────
  if (status === 4) {
    if (refunded) {
      return { mode: "none", maxStroops: 0n, reason: "You have already been refunded." };
    }
    if (contrib <= 0n) {
      return { mode: "none", maxStroops: 0n, reason: "No contribution to refund." };
    }
    return { mode: "refund", maxStroops: contrib, reason: null };
  }

  // ── Open (status 0): unfund path ─────────────────────────────────────────
  if (status === 0) {
    if (contrib <= 0n) {
      return { mode: "none", maxStroops: 0n, reason: null };
    }
    if (legalHold) {
      return {
        mode: "none",
        maxStroops: 0n,
        reason: "A legal hold is active — withdrawals are blocked.",
      };
    }
    if (paused) {
      return {
        mode: "none",
        maxStroops: 0n,
        reason: "The escrow is paused — withdrawals are temporarily unavailable.",
      };
    }
    return { mode: "unfund", maxStroops: contrib, reason: null };
  }

  // ── Any other status (funded, settled, withdrawn) ────────────────────────
  return { mode: "none", maxStroops: 0n, reason: null };
}

// ── Amount-validation helpers ─────────────────────────────────────────────
// STROOPS_PER_UNIT and the core parse/format logic are sourced from
// lib/stellar/amount.js so there is a single implementation.
// parseStroops is a thin wrapper that keeps the (input, maxStroops) call
// signature used by ExitPanel while delegating to parseToStroops.

import { STROOPS_PER_UNIT, parseToStroops, stroopsToDisplay } from "../stellar/amount.js";

export { STROOPS_PER_UNIT };

/**
 * Format stroops as a human-readable decimal string (e.g. "1.5").
 * Delegates to stroopsToDisplay from lib/stellar/amount.js.
 */
export function formatStroops(stroops) {
  return stroopsToDisplay(stroops);
}

/**
 * Parse a user-supplied decimal string into stroops (BigInt).
 * Thin wrapper around parseToStroops that adds max-bound and
 * zero-amount validation, keeping the existing (input, maxStroops) signature.
 *
 * @param {string} input
 * @param {bigint} maxStroops
 * @returns {{ stroops: bigint } | { error: string }}
 */
export function parseStroops(input, maxStroops) {
  if (!input || !input.trim()) return { error: "Enter an amount." };

  const trimmed = input.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    return { error: "Enter a valid positive number." };
  }

  const [, frac = ""] = trimmed.split(".");
  if (frac.length > 7) {
    return { error: "Maximum 7 decimal places (stroop precision)." };
  }

  const stroops = parseToStroops(trimmed);
  if (stroops === null) {
    return { error: "Enter a valid positive number." };
  }

  if (stroops <= 0n) return { error: "Amount must be greater than zero." };
  if (stroops > BigInt(maxStroops)) {
    return { error: "Amount exceeds your contribution." };
  }

  return { stroops };
}
