// Load and validate the escrow's on-chain funding constraints.
// All amounts are stroops (BigInt). Getters that the deployed wasm does not
// expose (or that fail) are reported in `errors` and their fields stay null:
// a failed read never blocks funding by itself - callers fall back to the
// basic amount > 0 check.
import { CONTRACT_ID } from "../config.js";
import { simulateCall, addressArg } from "../stellar/rpc.js";

// Escrow status enum value that accepts funding (EscrowStatus::Open).
export const STATUS_OPEN = 0;

const GETTERS = [
  ["get_escrow_summary", false],
  ["get_min_contribution_floor", false],
  ["get_max_per_investor_cap", false],
  ["get_remaining_funding_capacity", false],
  ["get_funding_deadline", false],
  ["get_contribution", true], // needs the investor address
];

const toBigIntOrNull = (v) => (v === null || v === undefined ? null : BigInt(v));
const toNumberOrNull = (v) => (v === null || v === undefined ? null : Number(v));

/**
 * Read the escrow's funding constraints once, in parallel.
 * @param {object} opts
 * @param {string} [opts.contractId]
 * @param {string} [opts.investor] - connected wallet (G...); when omitted the
 *   per-investor contribution is not read and `contribution` stays null.
 * @param {function} [opts.call] - injected simulate helper (tests)
 * @returns {Promise<{
 *   minContributionFloor: bigint|null, maxPerInvestorCap: bigint|null,
 *   remainingCapacity: bigint|null, fundingDeadline: number|null,
 *   paused: boolean|null, legalHold: boolean|null, status: number|null,
 *   contribution: bigint|null,
 *   errors: Array<{method: string, message: string}>
 * }>}
 */
export async function loadConstraints({ contractId = CONTRACT_ID, investor, call = simulateCall } = {}) {
  const jobs = GETTERS.filter(([, needsInvestor]) => !needsInvestor || investor).map(async ([method, needsInvestor]) => {
    const args = needsInvestor ? [addressArg(investor)] : [];
    try {
      return [method, await call({ contractId, method, args })];
    } catch (err) {
      return [method, { __error: err?.message || String(err) }];
    }
  });
  const entries = await Promise.all(jobs);

  const raw = {};
  const errors = [];
  for (const [method, value] of entries) {
    if (value && value.__error !== undefined) {
      errors.push({ method, message: value.__error });
    } else {
      raw[method] = value;
    }
  }

  const summary = raw.get_escrow_summary && typeof raw.get_escrow_summary === "object" ? raw.get_escrow_summary : null;
  const escrow = summary?.escrow && typeof summary.escrow === "object" ? summary.escrow : null;

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

export const CODES = {
  PAUSED: "PAUSED",
  LEGAL_HOLD: "LEGAL_HOLD",
  DEADLINE_PASSED: "DEADLINE_PASSED",
  NOT_OPEN: "NOT_OPEN",
  BELOW_FLOOR: "BELOW_FLOOR",
  ABOVE_INVESTOR_CAP: "ABOVE_INVESTOR_CAP",
  ABOVE_CAPACITY: "ABOVE_CAPACITY",
};

const MESSAGES = {
  PAUSED: "Funding is paused on this escrow.",
  LEGAL_HOLD: "A legal hold blocks funding on this escrow.",
  DEADLINE_PASSED: "The funding deadline has passed.",
  NOT_OPEN: "This escrow is not open for funding.",
  BELOW_FLOOR: "Amount is below the minimum contribution.",
  ABOVE_INVESTOR_CAP: "Amount exceeds your remaining per-investor cap.",
  ABOVE_CAPACITY: "Amount exceeds the remaining funding capacity.",
};

/**
 * Remaining room under the per-investor cap for this investor, or null when
 * there is no cap. Accounts for the contribution already made.
 */
export function remainingCapRoom(c) {
  if (!c || c.maxPerInvestorCap === null || c.maxPerInvestorCap === undefined) return null;
  const room = c.maxPerInvestorCap - (c.contribution ?? 0n);
  return room > 0n ? room : 0n;
}

/**
 * Largest amount the "Max" button may fill: the smaller of remaining
 * cap room and remaining capacity. Null when neither bound is known.
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
 * @param {object} c - constraints from loadConstraints (or a subset)
 * @param {object} [opts]
 * @param {number} [opts.nowSeconds] - injectable clock (tests)
 * @returns {{ ok: boolean, code: string|null, message: string|null }}
 */
export function validateContribution(amountStroops, c = {}, { nowSeconds = Math.floor(Date.now() / 1000) } = {}) {
  const amount = BigInt(amountStroops ?? 0);
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
