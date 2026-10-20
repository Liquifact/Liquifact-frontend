import { formatAmount } from "./format/currency.js";

export { formatAmount };

/**
 * Convert a basis-point rate to percentage points.
 *
 * @param {number|string|null|undefined} value
 * @returns {number|null}
 */
export function bpsToPercent(value) {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue / 100 : null;
}

/**
 * Resolve an invoice's funded percentage from an explicit percentage or its
 * funded and face-value amounts.
 *
 * @param {object|null|undefined} invoice
 * @returns {number}
 */
export function fundedPercent(invoice) {
  if (!invoice) return 0;

  const explicitPercent =
    invoice.fundedPercent ?? invoice.fundedPercentage ?? invoice.fundingPercent;
  if (explicitPercent !== null && explicitPercent !== undefined) {
    const numericPercent = Number(String(explicitPercent).replace(/%$/, ""));
    return Number.isFinite(numericPercent) ? Math.min(100, Math.max(0, numericPercent)) : 0;
  }

  if (invoice.fundedBps !== null && invoice.fundedBps !== undefined) {
    const percent = bpsToPercent(invoice.fundedBps);
    return percent === null ? 0 : Math.min(100, Math.max(0, percent));
  }

  const fundedAmount = Number(String(invoice.fundedAmount ?? "").replace(/,/g, ""));
  const faceValue = Number(
    String(invoice.amountValue ?? invoice.faceValue ?? invoice.amount ?? "").replace(/,/g, "")
  );
  if (!Number.isFinite(fundedAmount) || !Number.isFinite(faceValue) || faceValue <= 0) return 0;

  return Math.min(100, Math.max(0, (fundedAmount / faceValue) * 100));
}
