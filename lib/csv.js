/**
 * Pure CSV serialisation with spreadsheet-injection neutralisation.
 *
 * Runs on plain ESM so it can be imported by node:test and by the browser.
 */

const DANGEROUS_PREFIX = /^[=+\-@@A@\t\r]/;

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
 * @param {Array<{key: string, value?: string, label?: string}>} [columns] - column
 *   spec: `{ key, label }`. When omitted, a header less body is produced.
 * @param {{bom: boolean}} [options] - `set bom: true` to prefix a UTF-8 BOM.
 * @returns {string} CRLF-terminated CSV string.
 */
export function toCsv(rows, columns, options = {}) {
  const { bom = false } = options;
  const lines = [];

  if (columns && columns.length) {
    lines.push(columns.map((c) => quoteField(c.label ?? c.key)).join(","));
  }

  for (const row of rows || []) {
    const cells = columns && columns.length
      ? columns.map((c) => quoteField(sanitizeCell(typeof c.value === "function" ? c.value(row) : row[c.key])))
      : row.map((v) => quoteField(sanitizeCell(v)));
    lines.push(cells.join(","));
  }

  const body = lines.length ? lines.join("\r\n") + "\r\n" : "";
  return bom ? "\uFEFF" + body : body;
}

/**
 * Column spec for marketplace invoices. Numbers are formatted as plain
 * decimals (no thousands separators).
 */
export const INVOICE_COLUMNS = [
  { key: "id", label: "ID" },
  { key: "sme", label: "SME" },
  { key: "debtor", label: "Debtor" },
  { key: "faceValue", label: "Face value", value: (inv) => numberOrEmpty(inv.faceValue) },
  { key: "currency", label: "Currency" },
  { key: "funded", label: "Funded", value: (inv) => numberOrEmpty(inv.funded) },
  { key: "fundedPct", label: "Funded %", value: (inv) => numberOrEmpty(inv.fundedPct) },
  { key: "yieldPct", label: "Yield %", value: (inv) => numberOrEmpty(inv.yieldPct) },
  { key: "dueDate", label: "Due date (ISO)", value: (inv) => isoDate(inv.dueDate) },
  { key: "status", label: "Status" },
  { key: "onChain", label: "On-chain", value: (inv) => onChainLabel(inv.onChain) },
  { key: "smeWallet", label: "SME wallet" },
];

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
