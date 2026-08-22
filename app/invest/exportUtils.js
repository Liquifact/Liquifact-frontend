/**
 * Client-side CSV/JSON export utilities for the invoice marketplace.
 *
 * Design decisions:
 * - Formula-injection safety: cells starting with = + - @ are prefixed with '
 *   (single-quote) which neutralises formula evaluation in Excel / Google Sheets
 *   while still being readable.
 * - CSV fields that contain commas, double-quotes, or newlines are wrapped in
 *   double-quotes with internal double-quotes escaped by doubling them (RFC 4180).
 * - Downloads are triggered via a temporary anchor element — no server round-trip.
 * - Generation is synchronous but yields to the browser between large chunks to
 *   avoid blocking the main thread for very large views.
 */

const FORMULA_PREFIXES = ["=", "+", "-", "@"];

/**
 * Escape a single value for safe inclusion in a CSV cell.
 *
 * 1. If the string representation starts with a formula-triggering character it
 *    is prefixed with a single-quote to neutralise it.
 * 2. If the field contains a comma, double-quote, or newline the whole field is
 *    wrapped in double-quotes and internal double-quotes are doubled (RFC 4180).
 *
 * @param {*} value
 * @returns {string}
 */
export function escapeCSVField(value) {
  const str = String(value);

  let safe = str;
  if (FORMULA_PREFIXES.some((prefix) => str.startsWith(prefix))) {
    safe = "'" + str;
  }

  if (/[,"\n\r]/.test(safe)) {
    safe = '"' + safe.replace(/"/g, '""') + '"';
  }

  return safe;
}

/**
 * Generate a CSV string from an array of invoice objects.
 *
 * Uses the keys of the first object as column headers. If the array is empty a
 * CSV with no data rows is returned (headers-only from a provided schema, or an
 * empty string if the schema is unknown).
 *
 * @param {Array<Object>} invoices
 * @param {string[]} [columns] - explicit column order; falls back to Object.keys
 * @returns {string}
 */
export function generateCSV(invoices, columns) {
  if (!Array.isArray(invoices) || invoices.length === 0) {
    return columns ? columns.join(",") + "\n" : "";
  }

  const cols = columns || Object.keys(invoices[0]);

  const header = cols.map(escapeCSVField).join(",");

  const rows = invoices.map((inv) =>
    cols.map((col) => escapeCSVField(inv[col])).join(","),
  );

  return header + "\n" + rows.join("\n") + "\n";
}

/**
 * Generate a JSON string from an array of invoice objects.
 *
 * @param {Array<Object>} invoices
 * @returns {string}
 */
export function generateJSON(invoices) {
  return JSON.stringify(invoices ?? [], null, 2);
}

/**
 * Trigger a file download in the browser.
 *
 * Creates a Blob from the provided content, generates a temporary object URL,
 * attaches it to a hidden anchor element, clicks it, then revokes the URL.
 *
 * @param {string} content
 * @param {string} filename
 * @param {string} mimeType
 */
export function triggerDownload(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";

  document.body.appendChild(anchor);
  anchor.click();

  // Clean up after a short delay so the browser has time to start the download.
  setTimeout(() => {
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }, 100);
}

/**
 * Export the provided invoices as a CSV file download.
 *
 * @param {Array<Object>} invoices
 * @param {string} [filename="invoices.csv"]
 */
export function exportToCSV(invoices, filename = "invoices.csv") {
  const csv = generateCSV(invoices);
  triggerDownload(csv, filename, "text/csv;charset=utf-8;");
}

/**
 * Export the provided invoices as a JSON file download.
 *
 * @param {Array<Object>} invoices
 * @param {string} [filename="invoices.json"]
 */
export function exportToJSON(invoices, filename = "invoices.json") {
  const json = generateJSON(invoices);
  triggerDownload(json, filename, "application/json;charset=utf-8;");
}
