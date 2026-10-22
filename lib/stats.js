// Pure, dependency-free stats computed from the invoice list.
//
// Money is summed in integer minor units (hundredths) so that adding many
// decimal amounts (e.g. 0.1 + 0.2 style drift) can never corrupt a total.
// No money/decimal library exists in this repo, so minor units are the
// decimal-safe option per issue #1397.

const MINOR = 100;

function toMinor(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * MINOR);
}

function fromMinor(minor) {
  return minor / MINOR;
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
    const faceMinor = toMinor(invoice.amount);
    const fundedMinor = toMinor(invoice.fundedAmount);
    const yieldBps = Number(invoice.yieldBps);

    let bucket = currencies.get(code);
    if (!bucket) {
      bucket = { faceMinor: 0, fundedMinor: 0, weightedBpsMinor: 0 };
      currencies.set(code, bucket);
      order.push(code);
    }
    bucket.faceMinor += faceMinor;
    bucket.fundedMinor += fundedMinor;
    if (Number.isFinite(yieldBps)) {
      // Sum yieldBps * face-value in minor units, then divide once at the end.
      bucket.weightedBpsMinor += Math.round(yieldBps * MINOR) * faceMinor;
      yieldBpsSum += yieldBps;
      yieldBpsCount += 1;
    }
  }

  const byCurrency = {};
  for (const code of order) {
    const b = currencies.get(code);
    byCurrency[code] = {
      faceValue: fromMinor(b.faceMinor),
      funded: fromMinor(b.fundedMinor),
      weightedYieldBps: b.faceMinor > 0 ? b.weightedBpsMinor / b.faceMinor / MINOR : 0,
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
