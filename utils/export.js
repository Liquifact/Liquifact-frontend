/**
 * Safely escape a value for CSV.
 * - Wraps in double quotes if it contains commas, double quotes, or newlines.
 * - Escapes inner double quotes by doubling them.
 *
 * @param {any} value
 * @returns {string}
 */
export function escapeCSVValue(value) {
  if (value === null || value === undefined) {
    return "";
  }
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Converts an array of objects to a CSV string.
 *
 * @param {Array<object>} data
 * @returns {string}
 */
export function convertToCSV(data) {
  if (!Array.isArray(data) || data.length === 0) {
    return "";
  }
  const headers = Object.keys(data[0]);
  const headerRow = headers.map(escapeCSVValue).join(",");

  const rows = data.map((row) => {
    return headers.map((header) => escapeCSVValue(row[header])).join(",");
  });

  return [headerRow, ...rows].join("\n");
}

/**
 * Trigger a file download in the browser.
 *
 * @param {Blob} blob
 * @param {string} filename
 */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Exports data as a CSV file and triggers download.
 *
 * @param {Array<object>} data
 * @param {string} filename
 */
export function exportAsCSV(data, filename = "export.csv") {
  const csvStr = convertToCSV(data);
  const blob = new Blob([csvStr], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, filename);
}

/**
 * Exports data as a JSON file and triggers download.
 *
 * @param {Array<object>} data
 * @param {string} filename
 */
export function exportAsJSON(data, filename = "export.json") {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8;" });
  downloadBlob(blob, filename);
}
