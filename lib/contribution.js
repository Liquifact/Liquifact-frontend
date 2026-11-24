import { parse, sub, cmp, DECIMALS } from "./money.js";

const CURRENCY = "USDC";

function toMinorOrNull(value) {
  try {
    return parse(value, CURRENCY);
  } catch {
    return null;
  }
}

/** @typedef {import("./types.js").Invoice} Invoice */
/** @typedef {import("./types.js").ContributionValidation} ContributionValidation */

/**
 * Validate a contribution amount against invoice availability.
 * @param {unknown} input
 * @param {Partial<Invoice> | null | undefined} invoice
 * @returns {ContributionValidation}
 */
export function validateContribution(input, invoice) {
  if (input === undefined || input === null || String(input).trim() === "") {
    return { ok: false, amount: 0, error: "REQUIRED" };
  }
  if (invoice && invoice.status && invoice.status !== "open") {
    return { ok: false, amount: 0, error: "NOT_OPEN" };
  }
  const trimmed = String(input).trim();
  if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(trimmed)) {
    return { ok: false, amount: 0, error: "NOT_A_NUMBER" };
  }
  const n = Number(trimmed);
  if (trimmed.startsWith("-") || n <= 0) {
    return { ok: false, amount: n, error: "NON_POSITIVE" };
  }
  if (trimmed.includes(".")) {
    const decimals = trimmed.split(".")[1];
    if (decimals && decimals.replace(/0+$/, "").length > DECIMALS[CURRENCY]) {
      return { ok: false, amount: n, error: "TOO_MANY_DECIMALS" };
    }
  }
  const amountMinor = toMinorOrNull(trimmed.replace(/^\+/, ""));
  if (amountMinor === null) {
    return { ok: false, amount: n, error: "TOO_MANY_DECIMALS" };
  }
  if (invoice) {
    const total = toMinorOrNull(String(invoice.amount || 0)) ?? 0n;
    const funded = toMinorOrNull(String(invoice.fundedAmount || 0)) ?? 0n;
    const remaining = sub(total, funded, { clamp: true });
    if (cmp(amountMinor, remaining) > 0) {
      return { ok: false, amount: n, error: "EXCEEDS_REMAINING" };
    }
  }
  return { ok: true, amount: n, error: null };
}

/**
 * Return the non-negative increase in funded amount between invoice snapshots.
 * @param {Partial<Invoice> | null | undefined} before
 * @param {Partial<Invoice> | null | undefined} after
 * @returns {number}
 */
export function creditedAmount(before, after) {
  if (!before || !after) return 0;
  const diff = (after.fundedAmount || 0) - (before.fundedAmount || 0);
  return Math.max(0, diff);
}
