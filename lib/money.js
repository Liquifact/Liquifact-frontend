export const DECIMALS = Object.freeze({ XLM: 7, USDC: 7, EURC: 7 });

function decimalsFor(currency) {
  const decimals = DECIMALS[currency];
  if (decimals === undefined) throw new RangeError(`Unsupported currency: ${currency}`);
  return decimals;
}

function expandExponent(value) {
  const [mantissa, exponentText] = value.toLowerCase().split("e");
  if (exponentText === undefined) return value;

  const exponent = Number(exponentText);
  const decimalIndex = mantissa.indexOf(".");
  const point = (decimalIndex === -1 ? mantissa.length : decimalIndex) + exponent;
  const digits = mantissa.replace(".", "");
  if (point <= 0) return `0.${"0".repeat(-point)}${digits}`;
  if (point >= digits.length) return `${digits}${"0".repeat(point - digits.length)}`;
  return `${digits.slice(0, point)}.${digits.slice(point)}`;
}

export function parse(value, currency, { minor = false } = {}) {
  const decimals = decimalsFor(currency);

  if (minor) {
    if (typeof value !== "bigint" && !(typeof value === "string" && /^\d+$/.test(value))) {
      throw new TypeError("Minor-unit amounts must be a non-negative BigInt or integer string");
    }
    const amount = BigInt(value);
    if (amount < 0n) throw new RangeError("Amounts cannot be negative");
    return amount;
  }

  if (typeof value === "bigint") {
    throw new TypeError("Pass { minor: true } when parsing a stroop amount");
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value < 0 || value > Number.MAX_SAFE_INTEGER) {
      throw new RangeError("Amount must be a finite, non-negative, safely representable number");
    }
    value = expandExponent(value.toString());
  }
  if (typeof value !== "string" || !/^\d+(?:\.\d+)?$/.test(value)) {
    throw new TypeError("Amount must be a non-negative decimal number without an exponent");
  }

  const [whole, fraction = ""] = value.split(".");
  const significantFraction = fraction.replace(/0+$/, "");
  if (significantFraction.length > decimals) {
    throw new RangeError(`${currency} supports at most ${decimals} decimal places`);
  }

  const scale = 10n ** BigInt(decimals);
  const fractionalMinor = BigInt(significantFraction.padEnd(decimals, "0") || "0");
  return BigInt(whole) * scale + fractionalMinor;
}

function assertMinor(value) {
  if (typeof value !== "bigint") throw new TypeError("Money operations require BigInt minor units");
}

export function add(left, right) {
  assertMinor(left);
  assertMinor(right);
  return left + right;
}

export function sub(left, right, { clamp = false } = {}) {
  assertMinor(left);
  assertMinor(right);
  const result = left - right;
  return clamp ? (result < 0n ? 0n : result) : result;
}

export function cmp(left, right) {
  assertMinor(left);
  assertMinor(right);
  return left < right ? -1 : left > right ? 1 : 0;
}

export function min(left, right) {
  return cmp(left, right) <= 0 ? left : right;
}

function formatUnsigned(amount, digits, locale) {
  const scale = 10n ** BigInt(digits);
  const whole = amount / scale;
  const fraction = (amount % scale).toString().padStart(digits, "0").replace(/0+$/, "");
  const groupedWhole = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(whole);
  const decimalSeparator = new Intl.NumberFormat(locale).formatToParts(1.1).find((part) => part.type === "decimal")?.value || ".";
  return fraction ? `${groupedWhole}${decimalSeparator}${fraction}` : groupedWhole;
}

export function format(minor, currency, { locale = "en-US", maxFractionDigits = 2, includeCurrency = true } = {}) {
  assertMinor(minor);
  const decimals = decimalsFor(currency);
  if (!Number.isInteger(maxFractionDigits) || maxFractionDigits < 0 || maxFractionDigits > decimals) {
    throw new RangeError(`maxFractionDigits must be between 0 and ${decimals}`);
  }

  const negative = minor < 0n;
  const amount = negative ? -minor : minor;
  const quantum = 10n ** BigInt(decimals - maxFractionDigits);
  const rounded = ((amount + quantum / 2n) / quantum) * quantum;
  let result;
  if (amount > 0n && rounded === 0n) {
    result = `< ${formatUnsigned(quantum, decimals, locale)}`;
  } else {
    result = formatUnsigned(rounded, decimals, locale);
  }
  if (negative) result = `-${result}`;
  return includeCurrency ? `${result} ${currency}` : result;
}