// Stroop <-> display conversion helpers (7 decimal places, string/BigInt safe).
export const STROOPS_PER_UNIT = 10000000n;

/**
 * Convert a stroop amount (string | bigint) to a trimmed decimal string.
 * "123456789" -> "12.3456789", "10000000" -> "1", "0" -> "0".
 */
export function stroopsToDisplay(stroops) {
  const v = BigInt(stroops ?? 0);
  const sign = v < 0n ? "-" : "";
  const abs = v < 0n ? -v : v;
  const whole = abs / STROOPS_PER_UNIT;
  const frac = (abs % STROOPS_PER_UNIT).toString().padStart(7, "0").replace(/0+$/, "");
  return `${sign}${whole.toString()}${frac ? `.${frac}` : ""}`;
}

/**
 * Parse a user-typed decimal string into stroops (BigInt). Returns null on
 * invalid input; rounds toward zero beyond 7dp (rejected by callers first).
 */
export function parseToStroops(text) {
  if (typeof text !== "string") return null;
  const t = text.trim();
  if (!/^\d+(\.\d{0,7})?$/.test(t)) return null;
  const [whole, frac = ""] = t.split(".");
  return BigInt(whole) * STROOPS_PER_UNIT + BigInt((frac + "0000000").slice(0, 7) || "0");
}

/** Format a stroop amount with thousands separators and a currency suffix. */
export function formatStroops(stroops, currency) {
  const display = stroopsToDisplay(stroops);
  const [whole, frac] = display.split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${grouped}${frac ? `.${frac}` : ""} ${currency}`;
}

// --- On-chain funding (#1364): strict integer conversion for i128 amounts ---
export const MAX_I128 = (1n << 127n) - 1n;

/**
 * Strictly convert a decimal string (no signs/exponents, ≤ 7 decimals) to stroops.
 * Throws a user-facing error on invalid input or i128 overflow.
 */
export function toStroops(value) {
  if (typeof value !== "string" || !/^\d+(?:\.\d{1,7})?$/.test(value)) {
    throw new Error("Enter a decimal amount with at most 7 decimal places (no signs or exponents).");
  }
  const [whole, fraction = ""] = value.split(".");
  const amount = BigInt(whole) * STROOPS_PER_UNIT + BigInt(fraction.padEnd(7, "0"));
  if (amount > MAX_I128) throw new Error("Amount is too large.");
  return amount;
}

/** Remaining invoice capacity in stroops, using integer subtraction. */
export function remainingStroops(invoice) {
  const remaining = toStroops(String(invoice.amount)) - toStroops(String(invoice.fundedAmount));
  return remaining > 0n ? remaining : 0n;
}
