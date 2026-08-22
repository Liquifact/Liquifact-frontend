import { FORMAT_CONFIG } from "./config";

/**
 * Formats a numeric amount to a locale-aware string with thousands separators.
 * @param {number} value – Raw amount (e.g., 12500)
 * @param {string} [currency] – Optional currency code; currently unused but kept for extensibility.
 * @returns {string}
 */
export function formatAmount(value, currency = "") {
  const formatted = new Intl.NumberFormat(FORMAT_CONFIG.defaultLocale, {
    maximumFractionDigits: FORMAT_CONFIG.currency.integerMaximumFractionDigits,
  }).format(value);
  return currency ? `${formatted}` : formatted;
}

/**
 * Formats a numeric yield to a percentage string.
 * @param {number} value – Yield as a number (e.g., 8.2)
 * @returns {string}
 */
export function formatYield(value) {
  return `${value}${FORMAT_CONFIG.percentage.suffix}`;
}
