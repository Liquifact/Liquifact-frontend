/**
 * Safely escapes a string for CSV.
 * If the value contains commas, quotes, or newlines, it wraps the value in quotes
 * and escapes inner quotes by doubling them.
 *
 * @param {any} val - The value to escape
 * @returns {string} - Escaped CSV string
 */
export function escapeCSVValue(val) {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (/[",\n\r]/.test(str) || /^[=+\-@]/.test(str)) {
    const escaped = str.replace(/"/g, '""');
    const safe = /^[=+\-@]/.test(escaped) ? `'${escaped}` : escaped;
    return `"${safe}"`;
  }
  return str;
}

/**
 * Triggers a client-side file download.
 *
 * @param {Blob} blob - The blob to download
 * @param {string} filename - The filename to save as
 */
export function triggerDownload(blob, filename) {
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
 * Exports an array of objects to a CSV file.
 * Extracts headers from the keys of the first object.
 *
 * @param {Array<Object>} data - The data to export
 * @param {string} filename - The target filename
 */
export function exportAsCSV(data, filename) {
  if (!Array.isArray(data) || data.length === 0) {
    // Export empty file if no data
    const blob = new Blob([""], { type: "text/csv;charset=utf-8;" });
    triggerDownload(blob, filename);
    return;
  }

  const headers = Object.keys(data[0]);
  const csvRows = [];

  // Add header row
  csvRows.push(headers.map(escapeCSVValue).join(","));

  // Add data rows
  for (const row of data) {
    const values = headers.map((header) => {
      return escapeCSVValue(row[header]);
    });
    csvRows.push(values.join(","));
  }

  const csvString = csvRows.join("\n");
  const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, filename);
}

/**
 * Exports an array of objects to a JSON file.
 *
 * @param {Array<Object>} data - The data to export
 * @param {string} filename - The target filename
 */
export function exportAsJSON(data, filename) {
  if (!Array.isArray(data)) data = [];
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: "application/json;charset=utf-8;" });
  triggerDownload(blob, filename);
}
