import { FORMAT_CONFIG } from "./config";

/**
 * Formats a numeric amount to a locale-aware string with thousands separators.
 *
 * @param value    - Raw amount (e.g. `12500`).
 * @param currency - Optional currency code; currently unused but kept for extensibility.
 * @returns Formatted amount string (e.g. `"12,500"`).
 *
 * @example
 * formatAmount(12500)         // "12,500"
 * formatAmount(1234567.89)    // "1,234,568"
 */
export function formatAmount(value: number, currency = ""): string {
  const formatted = new Intl.NumberFormat(FORMAT_CONFIG.defaultLocale, {
    maximumFractionDigits: FORMAT_CONFIG.currency.integerMaximumFractionDigits,
  }).format(value);
  return currency ? `${formatted}` : formatted;
}

/**
 * Formats a numeric yield to a percentage string.
 *
 * @param value - Yield as a number (e.g. `8.2`).
 * @returns Formatted yield string (e.g. `"8.2%"`).
 *
 * @example
 * formatYield(8.2)   // "8.2%"
 * formatYield(7)     // "7%"
 */
export function formatYield(value: number): string {
  return `${value}${FORMAT_CONFIG.percentage.suffix}`;
}
