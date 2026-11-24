// Load and validate the escrow's on-chain funding constraints.
// All amounts are stroops (BigInt). Getters that the deployed wasm does not
// expose (or that fail) are reported in `errors` and their fields stay null:
// a failed read never blocks funding by itself - callers fall back to the
// basic amount > 0 check.
import { CONTRACT_ID } from "../config.js";
import { simulateCall, addressArg } from "../stellar/rpc.js";
import { CONSTRAINT_CODES, CONSTRAINT_MESSAGES } from "./errors.js";

/** @typedef {import("../types.js").EscrowConstraints} EscrowConstraints */

// Escrow status enum value that accepts funding (EscrowStatus::Open).
export const STATUS_OPEN = 0;

/** @type {Array<[string, boolean]>} */
const GETTERS = [
  ["get_escrow_summary", false],
  ["get_min_contribution_floor", false],
  ["get_max_per_investor_cap", false],
  ["get_remaining_funding_capacity", false],
  ["get_funding_deadline", false],
  ["get_contribution", true], // needs the investor address
];

/** @param {unknown} v @returns {bigint | null} */
const toBigIntOrNull = (v) => (v === null || v === undefined ? null : BigInt(/** @type {string | number | bigint | boolean} */ (v)));
/** @param {unknown} v @returns {number | null} */
const toNumberOrNull = (v) => (v === null || v === undefined ? null : Number(v));

/**
 * Read the escrow's funding constraints once, in parallel.
 * @param {object} [opts]
 * @param {string} [opts.contractId]
 * @param {string} [opts.investor] - connected wallet (G...); when omitted the
 *   per-investor contribution is not read and `contribution` stays null.
 * @param {(params: {contractId: string, method: string, args: unknown[]}) => Promise<unknown>} [opts.call] - injected simulate helper (tests)
 * @returns {Promise<EscrowConstraints>}
 */
export async function loadConstraints({ contractId = CONTRACT_ID, investor, call = simulateCall } = {}) {
  /** @type {Array<Promise<[string, unknown]>>} */
  const jobs = GETTERS.filter(([, needsInvestor]) => !needsInvestor || investor).map(async ([method, needsInvestor]) => {
    const args = needsInvestor && investor ? [addressArg(investor)] : [];
    try {
      return [method, await call({ contractId, method, args })];
    } catch (err) {
      return [method, { __error: err?.message || String(err) }];
    }
  });
  const entries = await Promise.all(jobs);

  /** @type {Record<string, unknown>} */

  /** @type {Record<string, unknown>} */
  const raw = {};
  /** @type {EscrowConstraints["errors"]} */
  const errors = [];
  for (const [method, value] of entries) {
    if (value && typeof value === "object" && "__error" in value) {
      errors.push({ method, message: /** @type {string} */ (value.__error) });
    } else {
      raw[method] = value;
    }
  }

  const summaryValue = raw.get_escrow_summary;
  const summary = summaryValue && typeof summaryValue === "object" ? /** @type {Record<string, unknown>} */ (summaryValue) : null;
  const escrowValue = summary?.escrow;
  const escrow = escrowValue && typeof escrowValue === "object" ? /** @type {Record<string, unknown>} */ (escrowValue) : null;

  return {
    minContributionFloor: toBigIntOrNull(raw.get_min_contribution_floor),
    // None on-chain -> null -> "No cap"
    maxPerInvestorCap: toBigIntOrNull(raw.get_max_per_investor_cap),
    remainingCapacity: toBigIntOrNull(raw.get_remaining_funding_capacity),
    // None on-chain -> null -> "No deadline"
    fundingDeadline: toNumberOrNull(raw.get_funding_deadline),
    paused: typeof summary?.paused === "boolean" ? summary.paused : null,
    legalHold: typeof summary?.legal_hold === "boolean" ? summary.legal_hold : null,
    status: escrow ? toNumberOrNull(escrow.status) : null,
    contribution: investor ? toBigIntOrNull(raw.get_contribution) : null,
    errors,
  };
}

export const CODES = CONSTRAINT_CODES;

const MESSAGES = CONSTRAINT_MESSAGES;

/**
 * Remaining room under the per-investor cap for this investor, or null when
 * there is no cap. Accounts for the contribution already made.
 * @param {Partial<EscrowConstraints> | null | undefined} c
 * @returns {bigint | null}
 */
export function remainingCapRoom(c) {
  if (!c || c.maxPerInvestorCap === null || c.maxPerInvestorCap === undefined) return null;
  const room = c.maxPerInvestorCap - (c.contribution ?? 0n);
  return room > 0n ? room : 0n;
}

/**
 * Largest amount the "Max" button may fill: the smaller of remaining
 * cap room and remaining capacity. Null when neither bound is known.
 * @param {Partial<EscrowConstraints> | null | undefined} c
 * @returns {bigint | null}
 */
export function maxFillAmount(c) {
  const room = remainingCapRoom(c);
  const capacity = c?.remainingCapacity ?? null;
  if (room === null && capacity === null) return null;
  if (room === null) return capacity;
  if (capacity === null) return room;
  return room < capacity ? room : capacity;
}

/**
 * Pure validation of a contribution against the loaded constraints.
 *
 * Deterministic check order (first failure wins):
 *   1. PAUSED            - escrow paused
 *   2. LEGAL_HOLD        - legal hold active
 *   3. DEADLINE_PASSED   - now >= funding deadline
 *   4. NOT_OPEN          - escrow status is not Open
 *   5. BELOW_FLOOR       - amount < minimum contribution floor
 *   6. ABOVE_INVESTOR_CAP- amount + existing contribution > per-investor cap
 *   7. ABOVE_CAPACITY    - amount > remaining funding capacity
 * Unknown fields (null after a read failure) never fail a check.
 *
 * @param {bigint|string} amountStroops
 * @param {Partial<EscrowConstraints>} [c] - constraints from loadConstraints (or a subset)
 * @param {{nowSeconds?: number}} [opts]
 * @param {number} [opts.nowSeconds] - injectable clock (tests)
 * @returns {{ ok: boolean, code: string|null, message: string|null }}
 */
export function validateContribution(amountStroops, c = {}, { nowSeconds = Math.floor(Date.now() / 1000) } = {}) {
  const amount = BigInt(amountStroops ?? 0);
  /** @param {keyof typeof MESSAGES} code */
  const fail = (code) => ({ ok: false, code, message: MESSAGES[code] });

  if (c.paused === true) return fail(CODES.PAUSED);
  if (c.legalHold === true) return fail(CODES.LEGAL_HOLD);
  if (c.fundingDeadline !== null && c.fundingDeadline !== undefined && nowSeconds >= c.fundingDeadline) {
    return fail(CODES.DEADLINE_PASSED);
  }
  if (c.status !== null && c.status !== undefined && c.status !== STATUS_OPEN) return fail(CODES.NOT_OPEN);
  if (c.minContributionFloor !== null && c.minContributionFloor !== undefined && amount < c.minContributionFloor) {
    return fail(CODES.BELOW_FLOOR);
  }
  const room = remainingCapRoom(c);
  if (room !== null && amount > room) return fail(CODES.ABOVE_INVESTOR_CAP);
  if (c.remainingCapacity !== null && c.remainingCapacity !== undefined && amount > c.remainingCapacity) {
    return fail(CODES.ABOVE_CAPACITY);
  }
  return { ok: true, code: null, message: null };
}
