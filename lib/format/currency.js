import { DEFAULT_CURRENCY, DEFAULT_LOCALE, FORMAT_CONFIG, INVALID_VALUE_FALLBACK } from "./config";

function normalizeNumericValue(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const normalized = value.trim().replace(/,/g, "").replace(/%$/, "");

    if (normalized === "") {
      return null;
    }

    const numericValue = Number(normalized);
    return Number.isFinite(numericValue) ? numericValue : null;
  }

  return null;
}

function createFormatter(locale, options) {
  try {
    return new Intl.NumberFormat(locale || FORMAT_CONFIG.defaultLocale, options);
  } catch {
    return new Intl.NumberFormat(FORMAT_CONFIG.defaultLocale, options);
  }
}

/**
 * Format a numeric value as currency using locale-aware grouping.
 *
 * Invalid, null, undefined, or NaN values return a display-safe fallback.
 *
 * @param {number|string|null|undefined} value
 * @param {object} [options]
 * @param {string} [options.currency=FORMAT_CONFIG.currency.currency]
 * @param {string} [options.locale=FORMAT_CONFIG.currency.locale]
 * @returns {string}
 */
export function formatCurrency(
  value,
  { currency = FORMAT_CONFIG.currency.currency, locale = FORMAT_CONFIG.currency.locale } = {}
) {
  const numericValue = normalizeNumericValue(value);

  if (numericValue === null) {
    return FORMAT_CONFIG.invalidValueFallback;
  }

  const currencyCode =
    typeof currency === "string" && currency.trim()
      ? currency.trim().toUpperCase()
      : FORMAT_CONFIG.currency.currency;

  const maximumFractionDigits = Number.isInteger(numericValue)
    ? FORMAT_CONFIG.currency.integerMaximumFractionDigits
    : FORMAT_CONFIG.currency.maximumFractionDigits;

  try {
    return createFormatter(locale, {
      style: FORMAT_CONFIG.currency.style,
      currency: currencyCode,
      maximumFractionDigits,
    }).format(numericValue);
  } catch {
    return createFormatter(locale, {
      style: FORMAT_CONFIG.currency.style,
      currency: FORMAT_CONFIG.currency.currency,
      maximumFractionDigits,
    }).format(numericValue);
  }
}

/**
 * Format a numeric amount with locale-aware grouping and no currency symbol.
 *
 * Invalid, null, undefined, or NaN values return a display-safe fallback.
 *
 * @param {number|string|null|undefined} value
 * @param {object} [options]
 * @param {string} [options.locale=FORMAT_CONFIG.amount.locale]
 * @param {number} [options.minimumFractionDigits=FORMAT_CONFIG.amount.minimumFractionDigits]
 * @param {number} [options.maximumFractionDigits=FORMAT_CONFIG.amount.maximumFractionDigits]
 * @returns {string}
 */
export function formatAmount(
  value,
  {
    locale = FORMAT_CONFIG.amount.locale,
    minimumFractionDigits = FORMAT_CONFIG.amount.minimumFractionDigits,
    maximumFractionDigits = FORMAT_CONFIG.amount.maximumFractionDigits,
  } = {}
) {
  const numericValue = normalizeNumericValue(value);

  if (numericValue === null) {
    return FORMAT_CONFIG.invalidValueFallback;
  }

  return createFormatter(locale, {
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(numericValue);
}

/**
 * Format a currency value using compact notation for large amounts.
 * Values >= 1,000 are abbreviated (1K, 1.2M, 3.4B, etc.).
 * Values < 1,000 fall back to standard formatCurrency.
 *
 * @param {number|string|null|undefined} value
 * @param {object} [options]
 * @param {string} [options.currency=FORMAT_CONFIG.currency.currency]
 * @param {string} [options.locale=FORMAT_CONFIG.currency.locale]
 * @returns {string}
 */
export function formatCurrencyCompact(
  value,
  { currency = FORMAT_CONFIG.currency.currency, locale = FORMAT_CONFIG.currency.locale } = {}
) {
  const numericValue = normalizeNumericValue(value);
  if (numericValue === null) return FORMAT_CONFIG.invalidValueFallback;

  const abs = Math.abs(numericValue);

  if (abs >= 1_000_000_000) {
    const billions = numericValue / 1_000_000_000;
    const formatted = createFormatter(locale, {
      maximumFractionDigits: FORMAT_CONFIG.currency.maximumFractionDigits,
    }).format(billions);
    return `${formatted}B ${currency}`;
  }

  if (abs >= 1_000_000) {
    const millions = numericValue / 1_000_000;
    const formatted = createFormatter(locale, {
      maximumFractionDigits: FORMAT_CONFIG.currency.maximumFractionDigits,
    }).format(millions);
    return `${formatted}M ${currency}`;
  }

  if (abs >= 1_000) {
    const thousands = numericValue / 1_000;
    const formatted = createFormatter(locale, {
      maximumFractionDigits: FORMAT_CONFIG.currency.maximumFractionDigits,
    }).format(thousands);
    return `${formatted}K ${currency}`;
  }

  return formatCurrency(value, { currency, locale });
}

/**
 * Format a numeric value as a percentage.
 *
 * Invalid, null, undefined, or NaN values return a display-safe fallback.
 *
 * @param {number|string|null|undefined} value
 * @param {object} [options]
 * @param {string} [options.locale=FORMAT_CONFIG.percentage.locale]
 * @param {number} [options.minimumFractionDigits=FORMAT_CONFIG.percentage.minimumFractionDigits]
 * @param {number} [options.maximumFractionDigits=FORMAT_CONFIG.percentage.maximumFractionDigits]
 * @returns {string}
 */
export function formatPercent(
  value,
  {
    locale = FORMAT_CONFIG.percentage.locale,
    minimumFractionDigits = FORMAT_CONFIG.percentage.minimumFractionDigits,
    maximumFractionDigits = FORMAT_CONFIG.percentage.maximumFractionDigits,
  } = {}
) {
  const numericValue = normalizeNumericValue(value);

  if (numericValue === null) {
    return FORMAT_CONFIG.invalidValueFallback;
  }

  const formattedNumber = createFormatter(locale, {
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(numericValue);

  return `${formattedNumber}${FORMAT_CONFIG.percentage.suffix}`;
}

export { DEFAULT_CURRENCY, DEFAULT_LOCALE, FORMAT_CONFIG, INVALID_VALUE_FALLBACK };
