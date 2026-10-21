const SCALE = 10_000_000n;
export const MAX_I128 = (1n << 127n) - 1n;

export function toStroops(value) {
  if (typeof value !== "string" || !/^\d+(?:\.\d{1,7})?$/.test(value)) {
    throw new Error("Enter a decimal amount with at most 7 decimal places (no signs or exponents).");
  }
  const [whole, fraction = ""] = value.split(".");
  const amount = BigInt(whole) * SCALE + BigInt(fraction.padEnd(7, "0"));
  if (amount > MAX_I128) throw new Error("Amount is too large.");
  return amount;
}

export function remainingStroops(invoice) {
  const remaining = toStroops(String(invoice.amount)) - toStroops(String(invoice.fundedAmount));
  return remaining > 0n ? remaining : 0n;
}

export function formatStroops(amount) {
  const fraction = (amount % SCALE).toString().padStart(7, "0").replace(/0+$/, "");
  return `${amount / SCALE}${fraction ? `.${fraction}` : ""}`;
}
