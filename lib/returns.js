const DEFAULT_DECIMALS = 7;
const MS_PER_DAY = 86_400_000;
const DAYS_PER_YEAR = 365;

export function parseAmount(input, decimals = DEFAULT_DECIMALS) {
  if (typeof input !== "string") {
    throw new Error("Amount must be a string");
  }
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 18) {
    throw new Error("Invalid decimal precision");
  }

  const value = input.trim();
  if (!/^\d+(?:\.\d+)?$/.test(value)) {
    throw new Error("Amount must be a positive decimal string");
  }

  const [whole, fraction = ""] = value.split(".");
  if (fraction.length > decimals) {
    throw new Error(`Amount supports at most ${decimals} decimal places`);
  }

  const scale = 10n ** BigInt(decimals);
  const fractionUnits = BigInt((fraction + "0".repeat(decimals)).slice(0, decimals));
  return BigInt(whole) * scale + fractionUnits;
}

export function formatMinor(minor, decimals = DEFAULT_DECIMALS) {
  if (typeof minor !== "bigint") {
    throw new Error("Minor units must be a BigInt");
  }
  const negative = minor < 0n;
  const absolute = negative ? -minor : minor;
  const scale = 10n ** BigInt(decimals);
  const whole = absolute / scale;
  const fraction = absolute % scale;

  let out = whole.toString();
  if (fraction > 0n) {
    out += `.${fraction.toString().padStart(decimals, "0").replace(/0+$/, "")}`;
  }
  return negative ? `-${out}` : out;
}

export function projectReturn({ principal, yieldBps, dueDate, nowMs = Date.now() }) {
  const principalMinor = parseAmount(
    typeof principal === "string" ? principal : String(principal),
  );
  if (principalMinor <= 0n) {
    throw new Error("Principal must be greater than zero");
  }

  const bps = Number(yieldBps);
  if (!Number.isInteger(bps) || bps < 0 || bps > 10_000) {
    throw new Error("Yield must be an integer between 0 and 10000 bps");
  }

  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) {
    throw new Error("Invalid due date");
  }

  const diff = due.getTime() - Number(nowMs);
  if (!Number.isFinite(diff)) {
    throw new Error("Invalid current time");
  }
  if (diff <= 0) {
    return { overdue: true };
  }

  const termDays = Math.max(1, Math.ceil(diff / MS_PER_DAY));
  const couponMinor = (principalMinor * BigInt(bps)) / 10_000n;
  const payoutMinor = principalMinor + couponMinor;
  const annualised = ((bps / 100) * DAYS_PER_YEAR) / termDays;

  return {
    coupon: formatMinor(couponMinor),
    payout: formatMinor(payoutMinor),
    termDays,
    annualisedPct: annualised.toFixed(2),
  };
}
