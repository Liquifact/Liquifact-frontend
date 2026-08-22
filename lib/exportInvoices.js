/**
 * Client-side CSV/JSON export utilities for the invoice upload view.
 * Pure functions (no DOM access) so escaping/formatting is unit-testable;
 * downloadInvoices is the only part that touches the DOM.
 */

export const EXPORT_COLUMNS = ["id", "issuer", "amount", "currency", "dueDate", "yield", "status"];

/**
 * Escapes a single CSV field per RFC 4180.
 * @param {unknown} value
 * @returns {string}
 */
export function escapeCsvField(value) {
  const str = value === null || value === undefined ? "" : String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Converts invoices to a CSV string with a header row. Empty array yields
 * just the header row (no data rows).
 * @param {Array<object>} invoices
 * @returns {string}
 */
export function invoicesToCsv(invoices) {
  const header = EXPORT_COLUMNS.map(escapeCsvField).join(",");
  const rows = invoices.map((invoice) =>
    EXPORT_COLUMNS.map((col) => escapeCsvField(invoice[col])).join(",")
  );
  return [header, ...rows].join("\r\n");
}

/**
 * Converts invoices to a pretty-printed JSON string.
 * @param {Array<object>} invoices
 * @returns {string}
 */
export function invoicesToJson(invoices) {
  return JSON.stringify(invoices, null, 2);
}

/**
 * Triggers a client-side file download for the given invoices, with no
 * server round-trip. Uses a Blob + temporary anchor element.
 * @param {Array<object>} invoices
 * @param {"csv"|"json"} format
 * @param {string} [filename]
 */
export function downloadInvoices(invoices, format, filename) {
  const isCsv = format === "csv";
  const content = isCsv ? invoicesToCsv(invoices) : invoicesToJson(invoices);
  const mimeType = isCsv ? "text/csv;charset=utf-8" : "application/json;charset=utf-8";
  const finalName = filename || `invoices.${format}`;

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = finalName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
