/**
 * @file lib/export/theme.js
 *
 * Client-side CSV and JSON export utilities for theme / design-token data.
 *
 * Design goals
 * ─────────────
 * • No server round-trip — all exports are generated in-browser and
 *   delivered via a programmatic anchor click (Blob URL).
 * • Safe escaping — CSV values containing commas, double-quotes, or
 *   newlines are wrapped in double-quotes with inner quotes doubled per
 *   RFC 4180 §2.
 * • Filter-respect — callers pass the already-filtered token list so
 *   the export always reflects the current view.
 * • Empty-view guard — when the token list is empty the export functions
 *   return `false` instead of triggering a download; the caller is
 *   responsible for surfacing an accessible announcement.
 *
 * Usage
 * ──────
 *   import { exportTokensAsCSV, exportTokensAsJSON } from "@/lib/export/theme";
 *
 *   const downloaded = exportTokensAsCSV(filteredTokens, "theme-export.csv");
 *   if (!downloaded) {
 *     // announce "Nothing to export" to assistive technology
 *   }
 *
 * Token shape (expected but not enforced — any array of objects works):
 *   { name: string, value: string, category: string, description?: string }
 */

// ── CSV helpers ───────────────────────────────────────────────────────────────

/**
 * Safely escapes a single value for inclusion in a CSV cell.
 *
 * Rules (RFC 4180 §2):
 *  - `null` / `undefined` → empty string (no surrounding quotes)
 *  - Values containing `,`, `"`, `\n`, or `\r` are wrapped in `"…"`;
 *    any `"` inside the value is doubled to `""`.
 *  - All other values are stringified and returned as-is.
 *
 * @param {*} val - The value to escape.
 * @returns {string}
 */
export function escapeCSVValue(val) {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Converts an array of objects to a CSV string.
 *
 * Column order is derived from `Object.keys` of the first item.
 * Returns an empty string when `rows` is empty.
 *
 * @param {Array<Object>} rows
 * @returns {string}
 */
export function buildCSV(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.map(escapeCSVValue).join(","),
    ...rows.map((row) => headers.map((h) => escapeCSVValue(row[h])).join(",")),
  ];
  return lines.join("\n");
}

// ── Download helper ───────────────────────────────────────────────────────────

/**
 * Triggers a client-side file download by creating a Blob URL, clicking a
 * programmatic `<a>` element, then cleaning up immediately.
 *
 * @param {Blob} blob     - The content to download.
 * @param {string} filename - The suggested filename.
 * @returns {void}
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

// ── Public export API ─────────────────────────────────────────────────────────

/**
 * Exports the given token rows as a UTF-8 CSV file and triggers a download.
 *
 * Returns `false` (and does **not** trigger a download) when `tokens` is
 * empty so callers can show an accessible empty-state announcement instead.
 *
 * @param {Array<Object>} tokens  - The (already-filtered) token rows to export.
 * @param {string}        filename - Suggested filename, e.g. `"theme-export.csv"`.
 * @returns {boolean} `true` if a download was triggered, `false` if empty.
 */
export function exportTokensAsCSV(tokens, filename = "theme-export.csv") {
  if (!Array.isArray(tokens) || tokens.length === 0) return false;

  const csv = buildCSV(tokens);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, filename);
  return true;
}

/**
 * Exports the given token rows as a pretty-printed UTF-8 JSON file and
 * triggers a download.
 *
 * Returns `false` (and does **not** trigger a download) when `tokens` is
 * empty.
 *
 * @param {Array<Object>} tokens  - The (already-filtered) token rows to export.
 * @param {string}        filename - Suggested filename, e.g. `"theme-export.json"`.
 * @returns {boolean} `true` if a download was triggered, `false` if empty.
 */
export function exportTokensAsJSON(tokens, filename = "theme-export.json") {
  if (!Array.isArray(tokens) || tokens.length === 0) return false;

  const json = JSON.stringify(tokens, null, 2);
  const blob = new Blob([json], { type: "application/json;charset=utf-8;" });
  triggerDownload(blob, filename);
  return true;
}
