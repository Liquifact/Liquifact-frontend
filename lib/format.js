import * as money from "./money.js";

export function formatAmount(value, currency = "USDC", locale = "en-US") {
  try {
    return money.format(money.parse(value, currency), currency, { locale });
  } catch {
    // Unsupported currency or malformed value: keep the previous lenient rendering.
    const n = Number(value) || 0;
    return `${n.toLocaleString(locale, { maximumFractionDigits: 2 })} ${currency}`;
  }
}

export function bpsToPercent(bps, locale = "en-US") {
  const fraction = (Number(bps) || 0) / 10000;
  return new Intl.NumberFormat(locale, {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(fraction);
}

export function fundedPercent(invoice) {
  if (!invoice || invoice.amount === null || invoice.amount === undefined) return 0;
  try {
    const currency = invoice.currency || "USDC";
    const amount = money.parse(invoice.amount, currency);
    if (amount === 0n) return 0;
    const funded = money.parse(invoice.fundedAmount ?? 0, currency);
    return funded >= amount ? 100 : Number((funded * 100n) / amount);
  } catch {
    if (!invoice.amount) return 0;
    return Math.max(0, Math.min(100, Math.floor((invoice.fundedAmount / invoice.amount) * 100)));
  }
}

export function fundedPercentPrecise(invoice) {
  if (!invoice || invoice.amount === null || invoice.amount === undefined) return 0;
  try {
    const currency = invoice.currency || "USDC";
    const amount = money.parse(invoice.amount, currency);
    if (amount === 0n) return 0;
    const funded = money.parse(invoice.fundedAmount ?? 0, currency);
    if (funded >= amount) return 100;
    const tenths = (funded * 1000n) / amount;
    return Number(tenths) / 10;
  } catch {
    if (!invoice.amount) return 0;
    return Math.max(0, Math.min(100, Math.floor((invoice.fundedAmount / invoice.amount) * 1000) / 10));
  }
}

export function shortAddress(addr, size = 6) {
  if (!addr || addr.length <= size * 2 + 1) return addr || "";
  return `${addr.slice(0, size)}…${addr.slice(-size)}`;
}

export function formatDate(iso, locale = "en-US") {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso || "";
  return d.toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
}

/**
 * Validate invoice fields and return stable error codes (not user-facing prose).
 * Codes are resolved to dictionary messages by the UI.
 */
export function validateInvoiceForm(form) {
  const errors = {};
  if (!form.sme || !form.sme.trim()) errors.sme = "sme.required";
  if (!form.debtor || !form.debtor.trim()) errors.debtor = "debtor.required";
  try {
    if (money.parse(form.amount, form.currency || "USDC") <= 0n) errors.amount = "amount.positive";
  } catch {
    errors.amount = "amount.positive";
  }
  const yieldBps = Number(form.yieldBps);
  if (!Number.isInteger(yieldBps) || yieldBps < 0 || yieldBps > 10000) errors.yieldBps = "yield.range";
  if (!form.dueDate || Number.isNaN(Date.parse(form.dueDate))) errors.dueDate = "dueDate.required";
  return errors;
}
