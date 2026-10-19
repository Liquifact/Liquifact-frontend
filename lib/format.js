export function formatAmount(value, currency = "USDC", locale = "en-US") {
  const n = Number(value) || 0;
  return `${n.toLocaleString(locale, { maximumFractionDigits: 2 })} ${currency}`;
}

export function bpsToPercent(bps, locale = "en-US") {
  const n = (Number(bps) || 0) / 100;
  return `${n.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

export function fundedPercent(invoice) {
  if (!invoice || !invoice.amount) return 0;
  return Math.max(0, Math.min(100, Math.round((invoice.fundedAmount / invoice.amount) * 100)));
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

export function validateInvoiceForm(form) {
  const errors = {};
  if (!form.sme || !form.sme.trim()) errors.sme = "Company name is required";
  if (!form.debtor || !form.debtor.trim()) errors.debtor = "Debtor is required";
  const amount = Number(form.amount);
  if (!(amount > 0)) errors.amount = "Enter a positive amount";
  const yieldBps = Number(form.yieldBps);
  if (!Number.isInteger(yieldBps) || yieldBps < 0 || yieldBps > 10000) errors.yieldBps = "Yield must be 0–10000 bps";
  if (!form.dueDate || Number.isNaN(Date.parse(form.dueDate))) errors.dueDate = "Pick a due date";
  return errors;
}
