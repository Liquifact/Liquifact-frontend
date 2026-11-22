// Pure, dependency-free stats computed from the invoice list.
//
// Money is summed in BigInt minor units at each currency's native precision
// (7 decimals for XLM/USDC/EURC per lib/money.js) so sub-cent amounts are
// preserved and large sums never lose exactness.

import { DECIMALS, add, parse } from "./money.js";

const DEFAULT_DECIMALS = 2;
const YIELD_SCALE = 100n;
const YIELD_DIV_PRECISION = 1_000_000n;

function decimalsFor(code) {
  return Object.prototype.hasOwnProperty.call(DECIMALS, code) ? DECIMALS[code] : DEFAULT_DECIMALS;
}

function toMinor(value, code) {
  if (value === null || value === undefined || value === "") return 0n;
  const normalized = typeof value === "string" ? value.trim() : value;
  if (normalized === "") return 0n;

  if (Object.prototype.hasOwnProperty.call(DECIMALS, code)) {
    try {
      return parse(normalized, code);
    } catch {
      return 0n;
    }
  }

  // Fallback for non-Stellar currencies (e.g. EUR, USD) using DEFAULT_DECIMALS.
  const n = Number(normalized);
  if (!Number.isFinite(n) || n < 0) return 0n;
  const scale = 10 ** DEFAULT_DECIMALS;
  return BigInt(Math.round(n * scale));
}

function fromMinor(minor, decimals) {
  if (minor === 0n) return 0;
  const negative = minor < 0n;
  const abs = negative ? -minor : minor;
  const scale = 10n ** BigInt(decimals);
  const whole = abs / scale;
  const frac = (abs % scale).toString().padStart(decimals, "0").replace(/0+$/, "");
  const text = frac ? `${whole}.${frac}` : `${whole}`;
  return Number(negative ? `-${text}` : text);
}

/**
 * Compute home-page stats from a list of invoices.
 *
 * @param {Array<{amount?: number|string, fundedAmount?: number|string, currency?: string, yieldBps?: number|string, status?: string}>} invoices
 * @returns {{
 *   count: number,
 *   open: number,
 *   byCurrency: Record<string, {faceValue: number, funded: number, weightedYieldBps: number}>,
 *   simpleAvgYieldBps: number
 * }}
 *
 * - faceValue / funded are per-currency totals in major units; they must never
 *   be added across currencies.
 * - weightedYieldBps is the face-value-weighted mean yield within a currency
 *   (a 42,000 USDC invoice at 7.2% moves the number more than a 100 XLM one).
 * - simpleAvgYieldBps is the unweighted mean across all invoices, kept only so
 *   the UI can be explicit about which definition it shows.
 */
export function computeStats(invoices) {
  const list = Array.isArray(invoices) ? invoices : [];

  let count = 0;
  let open = 0;
  let yieldBpsSum = 0;
  let yieldBpsCount = 0;
  const currencies = new Map(); // code -> { faceMinor, fundedMinor, weightedBpsMinor }
  const order = [];

  for (const invoice of list) {
    if (!invoice || typeof invoice !== "object") continue;
    count += 1;
    if (invoice.status === "open") open += 1;

    const code = String(invoice.currency || "USD").toUpperCase();
    const faceMinor = toMinor(invoice.amount, code);
    const fundedMinor = toMinor(invoice.fundedAmount, code);
    const yieldBps = Number(invoice.yieldBps);

    let bucket = currencies.get(code);
    if (!bucket) {
      bucket = { decimals: decimalsFor(code), faceMinor: 0n, fundedMinor: 0n, weightedBpsMinor: 0n };
      currencies.set(code, bucket);
      order.push(code);
    }
    bucket.faceMinor = add(bucket.faceMinor, faceMinor);
    bucket.fundedMinor = add(bucket.fundedMinor, fundedMinor);
    if (Number.isFinite(yieldBps)) {
      // Sum yieldBps * face-value in minor units, then divide once at the end.
      const scaledYield = BigInt(Math.round(yieldBps * Number(YIELD_SCALE)));
      bucket.weightedBpsMinor = add(bucket.weightedBpsMinor, scaledYield * faceMinor);
      yieldBpsSum += yieldBps;
      yieldBpsCount += 1;
    }
  }

  const byCurrency = {};
  for (const code of order) {
    const b = currencies.get(code);
    const weightedYieldBps =
      b.faceMinor > 0n
        ? Number((b.weightedBpsMinor * YIELD_DIV_PRECISION) / (b.faceMinor * YIELD_SCALE)) /
          Number(YIELD_DIV_PRECISION)
        : 0;
    byCurrency[code] = {
      faceValue: fromMinor(b.faceMinor, b.decimals),
      funded: fromMinor(b.fundedMinor, b.decimals),
      weightedYieldBps,
    };
  }

  return {
    count,
    open,
    byCurrency,
    simpleAvgYieldBps: yieldBpsCount > 0 ? yieldBpsSum / yieldBpsCount : 0,
  };
}

/**
 * The currency with the largest listed face value, or null for an empty list.
 * Used to pick which currency's weighted yield is shown as the headline number.
 */
export function primaryCurrency(byCurrency) {
  const codes = Object.keys(byCurrency || {});
  if (codes.length === 0) return null;
  return codes.reduce((best, code) => (byCurrency[code].faceValue > byCurrency[best].faceValue ? code : best), codes[0]);
}
