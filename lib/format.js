import * as money from "./money.js";

export function formatAmount(value, currency = "USDC") {
  return money.format(money.parse(value, currency), currency);
}

export function bpsToPercent(bps) {
  return `${((Number(bps) || 0) / 100).toFixed(2)}%`;
}

export function fundedPercent(invoice) {
  if (!invoice || invoice.amount === null || invoice.amount === undefined) return 0;
  const currency = invoice.currency || "USDC";
  const amount = money.parse(invoice.amount, currency);
  if (amount === 0n) return 0;
  const funded = money.parse(invoice.fundedAmount ?? 0, currency);
  return funded >= amount ? 100 : Number((funded * 100n) / amount);
}

export function fundedPercentPrecise(invoice) {
  if (!invoice || invoice.amount === null || invoice.amount === undefined) return 0;
  const currency = invoice.currency || "USDC";
  const amount = money.parse(invoice.amount, currency);
  if (amount === 0n) return 0;
  const funded = money.parse(invoice.fundedAmount ?? 0, currency);
  if (funded >= amount) return 100;
  const tenths = (funded * 1000n) / amount;
  return Number(tenths) / 10;
}

export function shortAddress(addr, size = 6) {
  if (!addr || addr.length <= size * 2 + 1) return addr || "";
  return `${addr.slice(0, size)}…${addr.slice(-size)}`;
}

export function formatDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso || "";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
}

export function validateInvoiceForm(form) {
  const errors = {};
  if (!form.sme || !form.sme.trim()) errors.sme = "Company name is required";
  if (!form.debtor || !form.debtor.trim()) errors.debtor = "Debtor is required";
  try {
    if (money.parse(form.amount, form.currency || "USDC") <= 0n) errors.amount = "Enter a positive amount";
  } catch {
    errors.amount = "Enter a positive amount";
  }
  const yieldBps = Number(form.yieldBps);
  if (!Number.isInteger(yieldBps) || yieldBps < 0 || yieldBps > 10000) errors.yieldBps = "Yield must be 0–10000 bps";
  if (!form.dueDate || Number.isNaN(Date.parse(form.dueDate))) errors.dueDate = "Pick a due date";
  return errors;
}
