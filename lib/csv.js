/**
 * Pure CSV serialisation with spreadsheet-injection neutralisation.
 *
 * Runs on plain ESM so it can be imported by node:test and by the browser.
 */

import { getRiskBand, scoreInvoice } from "./risk.js";

const DANGEROUS_PREFIX = /^[=+\-@\t\r]/;

/**
 * Neutralise a single cell value against CSV / formula injection.
 *
 * Strings starting with = + - @ tab or CR are prefixed with a single quote
 * so spreadsheets treat them as literal text. Real numbers (e.g. -5) are
 * left as numbers.
 */
export function sanitizeCell(value) {
  if (value === null || typeof value === "undefined") return "";
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : "";
  }
  if (typeof value === "boolean") return value ? "true" : "false";
  const str = String(value);
  if (str.length === 0) return "";
  if (DANGEROUS_PREFIX.test(str)) return "'" + str;
  return str;
}

/**
 * Quote a single field per RFC 4180: wrap in double quotes when it contains
 * a comma, double quote, CR or LF, and double any embedded double quotes.
 */
export function quoteField(field) {
  const str = field === null || typeof field === "undefined" ? "" : String(field);
  if (/[,"\r\n]/.test(str)) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

/**
 * Serialise rows to CSV.
 *
 * @param {Array<Object|Array>} rows - array of rows. Object rows are read
 *   via the `columns` spec; array rows are used as-is.
 * @param {Array<{key: string, value?: Function, label?: string}>} [columns] - column
 *   spec: `{ key, label, value }`. `value(row, context)` derives the cell; when
 *   omitted `row[key]` is used. When `columns` is omitted, a header-less body is produced.
 * @param {{bom?: boolean, context?: unknown}} [options] - `bom: true` prefixes a
 *   UTF-8 BOM; `context` is passed as the second argument to every `value()`.
 * @returns {string} CRLF-terminated CSV string.
 */
export function toCsv(rows, columns, options = {}) {
  const { bom = false, context } = options;
  const lines = [];

  if (columns && columns.length) {
    lines.push(columns.map((c) => quoteField(c.label ?? c.key)).join(","));
  }

  for (const row of rows || []) {
    const cells = columns && columns.length
      ? columns.map((c) => quoteField(sanitizeCell(typeof c.value === "function" ? c.value(row, context) : row[c.key])))
      : row.map((v) => quoteField(sanitizeCell(v)));
    lines.push(cells.join(","));
  }

  const body = lines.length ? lines.join("\r\n") + "\r\n" : "";
  return bom ? "\uFEFF" + body : body;
}

/**
 * Column spec for marketplace invoices (API shape: amount, fundedAmount,
 * yieldBps, smeAddress). Numbers are exported as plain decimals.
 */
export const INVOICE_COLUMNS = [
  { key: "id", label: "ID" },
  { key: "sme", label: "SME" },
  { key: "debtor", label: "Debtor" },
  { key: "amount", label: "Face value", value: (inv) => numberOrEmpty(inv.amount) },
  { key: "currency", label: "Currency" },
  { key: "fundedAmount", label: "Funded", value: (inv) => numberOrEmpty(inv.fundedAmount) },
  { key: "fundedPct", label: "Funded %", value: (inv) => fundedPct(inv) },
  { key: "yieldPct", label: "Yield %", value: (inv) => yieldPct(inv.yieldBps) },
  { key: "dueDate", label: "Due date (ISO)", value: (inv) => isoDate(inv.dueDate) },
  { key: "status", label: "Status" },
  { key: "onChain", label: "On-chain", value: (inv) => onChainLabel(inv.onChain) },
  { key: "smeAddress", label: "SME wallet" },
];

function fundedPct(inv) {
  const amount = Number(inv.amount);
  const funded = Number(inv.fundedAmount);
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(funded)) return "";
  return Math.round(Math.min(100, Math.max(0, (funded / amount) * 100)) * 100) / 100;
}

function yieldPct(bps) {
  const n = numberOrEmpty(bps);
  return n === "" ? "" : n / 100;
}

/**
 * Risk columns appended when a scoring context is supplied. Values come from
 * `scoreInvoice` / `getRiskBand` so they match the badge shown in the UI;
 * unscorable rows (settled, cancelled) export empty cells.
 */
export const RISK_COLUMNS = [
  { key: "riskScore", label: "Risk score", value: (inv, ctx) => riskScore(inv, ctx) ?? "" },
  { key: "riskBand", label: "Risk band", value: (inv, ctx) => getRiskBand(riskScore(inv, ctx)) ?? "" },
];

/** Score (0-100) or null when the invoice is not scorable. */
function riskScore(inv, ctx) {
  return scoreInvoice(inv, ctx?.now, ctx?.medians ?? {}).score;
}

/**
 * Serialise invoices with the marketplace column spec.
 *
 * @param {Array<Object>} invoices
 * @param {{bom?: boolean, context?: {medians?: {medianYield: number, medianTicketSize: number}, now?: Date|number|string}}} [options]
 *   When `context` is supplied, `riskScore` and `riskBand` columns are appended
 *   (scored against `context.medians` at `context.now`, default: current time).
 */
export function invoicesToCsv(invoices, options = {}) {
  const columns = options.context ? [...INVOICE_COLUMNS, ...RISK_COLUMNS] : INVOICE_COLUMNS;
  return toCsv(invoices, columns, options);
}

/** `liquifact-invoices-YYYY-MM-DD.csv` for the given date (UTC). */
export function defaultFilename(now = new Date()) {
  return `liquifact-invoices-${now.toISOString().slice(0, 10)}.csv`;
}

/**
 * Download invoices as a CSV file (browser only): Blob + temporary <a download>,
 * revoking the object URL afterwards. Returns the Blob.
 * Pass `{ context: { medians, now } }` to include risk score/band columns.
 */
export function exportInvoicesCsv(invoices, filename = defaultFilename(), { context } = {}) {
  const blob = new Blob([invoicesToCsv(invoices, { bom: true, context })], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
  return blob;
}

function numberOrEmpty(v) {
  if (v === null || typeof v === "undefined" || v === "") return "";
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : "";
}

function isoDate(v) {
  if (!v) return "";
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

function onChainLabel(v) {
  if (v === true) return "Yes";
  if (v === false) return "No";
  if (v === null || typeof v === "undefined" || v === "") return "";
  return String(v);
}
