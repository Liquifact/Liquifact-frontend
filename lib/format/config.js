/**
 * Centralized numerical format configuration object (Single Source of Truth)
 * for monetary, amount, and percentage formatting across lib/format.
 */
export const FORMAT_CONFIG = Object.freeze({
  defaultLocale: "en-US",
  defaultCurrency: "USD",
  invalidValueFallback: "—",
  currency: Object.freeze({
    style: "currency",
    currency: "USD",
    locale: "en-US",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    integerMaximumFractionDigits: 0,
  }),
  amount: Object.freeze({
    locale: "en-US",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }),
  percentage: Object.freeze({
    locale: "en-US",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    style: "percent",
    suffix: "%",
  }),
});

export const DEFAULT_LOCALE = FORMAT_CONFIG.defaultLocale;
export const DEFAULT_CURRENCY = FORMAT_CONFIG.defaultCurrency;
export const INVALID_VALUE_FALLBACK = FORMAT_CONFIG.invalidValueFallback;
