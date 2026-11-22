// Structured Soroban contract error table & parser, plus shared escrow constraint codes.

/** Frozen map of known Soroban escrow contract error codes to user-facing messages. */
export const CONTRACT_ERROR_CODES = Object.freeze({
  142: "Escrow is not cancelled — refund not available",
  143: "No contribution to refund",
  220: "Escrow is not open — withdrawal not available",
  221: "Withdrawal amount exceeds your contribution",
  222: "A legal hold is active — withdrawal blocked",
});

/** Frozen constraint validation codes shared with `lib/escrow/constraints.js`. */
export const CONSTRAINT_CODES = Object.freeze({
  PAUSED: "PAUSED",
  LEGAL_HOLD: "LEGAL_HOLD",
  DEADLINE_PASSED: "DEADLINE_PASSED",
  NOT_OPEN: "NOT_OPEN",
  BELOW_FLOOR: "BELOW_FLOOR",
  ABOVE_INVESTOR_CAP: "ABOVE_INVESTOR_CAP",
  ABOVE_CAPACITY: "ABOVE_CAPACITY",
});

/** Frozen constraint validation messages shared with `lib/escrow/constraints.js`. */
export const CONSTRAINT_MESSAGES = Object.freeze({
  PAUSED: "Funding is paused on this escrow.",
  LEGAL_HOLD: "A legal hold blocks funding on this escrow.",
  DEADLINE_PASSED: "The funding deadline has passed.",
  NOT_OPEN: "This escrow is not open for funding.",
  BELOW_FLOOR: "Amount is below the minimum contribution.",
  ABOVE_INVESTOR_CAP: "Amount exceeds your remaining per-investor cap.",
  ABOVE_CAPACITY: "Amount exceeds the remaining funding capacity.",
});

// Matches Soroban contract error forms: `Error(Contract, #N)` or `(N)`.
const CONTRACT_ERROR_RE = /Error\(\s*Contract\s*,\s*#(\d+)\s*\)|\((\d+)\)/g;

/**
 * Parse a raw Soroban simulation error string for a known escrow contract error code.
 * Only matches explicit contract-error forms (`Error(Contract, #N)` or `(N)`).
 *
 * @param {unknown} raw
 * @returns {{ code: number, message: string } | null}
 */
export function parseContractError(raw) {
  if (raw === null || raw === undefined || raw === "") return null;
  const text = String(raw);
  for (const match of text.matchAll(CONTRACT_ERROR_RE)) {
    const code = Number(match[1] ?? match[2]);
    if (Object.hasOwn(CONTRACT_ERROR_CODES, code)) {
      return { code, message: CONTRACT_ERROR_CODES[code] };
    }
  }
  return null;
}
