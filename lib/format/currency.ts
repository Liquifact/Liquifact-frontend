import { DEFAULT_CURRENCY, DEFAULT_LOCALE, FORMAT_CONFIG, INVALID_VALUE_FALLBACK } from "./config";

/** Accepted input type for all numeric formatting functions. */
export type NumericInput = number | string | null | undefined;

/** Options accepted by {@link formatCurrency} and {@link formatCurrencyCompact}. */
export interface CurrencyOptions {
  /** ISO 4217 currency code (e.g. `"USD"`, `"EUR"`). Defaults to `FORMAT_CONFIG.currency.currency`. */
  currency?: string;
  /** BCP 47 locale string (e.g. `"en-US"`, `"en-IN"`). Defaults to `FORMAT_CONFIG.currency.locale`. */
  locale?: string;
}

/** Options accepted by {@link formatAmount}. */
export interface AmountOptions {
  /** BCP 47 locale string. Defaults to `FORMAT_CONFIG.amount.locale`. */
  locale?: string;
  /** Minimum fraction digits. Defaults to `FORMAT_CONFIG.amount.minimumFractionDigits`. */
  minimumFractionDigits?: number;
  /** Maximum fraction digits. Defaults to `FORMAT_CONFIG.amount.maximumFractionDigits`. */
  maximumFractionDigits?: number;
}

/** Options accepted by {@link formatPercent}. */
export interface PercentOptions {
  /** BCP 47 locale string. Defaults to `FORMAT_CONFIG.percentage.locale`. */
  locale?: string;
  /** Minimum fraction digits. Defaults to `FORMAT_CONFIG.percentage.minimumFractionDigits`. */
  minimumFractionDigits?: number;
  /** Maximum fraction digits. Defaults to `FORMAT_CONFIG.percentage.maximumFractionDigits`. */
  maximumFractionDigits?: number;
}

/**
 * Normalizes a value to a finite number, or returns `null` for invalid inputs.
 * Handles numbers, numeric strings (with optional commas and trailing `%`).
 *
 * @internal
 */
function normalizeNumericValue(value: NumericInput): number | null {
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

/**
 * Creates an `Intl.NumberFormat` instance, falling back to the default locale
 * if the supplied locale string is invalid.
 *
 * @internal
 */
function createFormatter(
  locale: string | undefined,
  options: Intl.NumberFormatOptions
): Intl.NumberFormat {
  try {
    return new Intl.NumberFormat(locale || FORMAT_CONFIG.defaultLocale, options);
  } catch {
    return new Intl.NumberFormat(FORMAT_CONFIG.defaultLocale, options);
  }
}

/**
 * Format a numeric value as currency using locale-aware grouping.
 *
 * Invalid, null, undefined, or NaN values return a display-safe fallback (`"—"`).
 *
 * @param value   - The value to format. Accepts numbers, numeric strings, `null`, or `undefined`.
 * @param options - Optional overrides for currency code and locale.
 * @returns Formatted currency string or `INVALID_VALUE_FALLBACK` on error.
 *
 * @example
 * formatCurrency(12500)                        // "$12,500"
 * formatCurrency(7800, { currency: "EUR" })    // "€7,800"
 * formatCurrency(null)                         // "—"
 */
export function formatCurrency(value: NumericInput, options: CurrencyOptions = {}): string {
  const { currency = FORMAT_CONFIG.currency.currency, locale = FORMAT_CONFIG.currency.locale } =
    options;

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
 * Invalid, null, undefined, or NaN values return a display-safe fallback (`"—"`).
 *
 * @param value   - The value to format. Accepts numbers, numeric strings, `null`, or `undefined`.
 * @param options - Optional overrides for locale and fraction digits.
 * @returns Formatted amount string or `INVALID_VALUE_FALLBACK` on error.
 *
 * @example
 * formatAmount(1234567.89)   // "1,234,567.89"
 * formatAmount("8.25%")      // "8.25"
 * formatAmount(null)         // "—"
 */
export function formatAmount(value: NumericInput, options: AmountOptions = {}): string {
  const {
    locale = FORMAT_CONFIG.amount.locale,
    minimumFractionDigits = FORMAT_CONFIG.amount.minimumFractionDigits,
    maximumFractionDigits = FORMAT_CONFIG.amount.maximumFractionDigits,
  } = options;

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
 * Values ≥ 1,000 are abbreviated (e.g. `"1K USD"`, `"1.2M USD"`, `"3.4B USD"`).
 * Values < 1,000 fall back to standard {@link formatCurrency}.
 *
 * @param value   - The value to format. Accepts numbers, numeric strings, `null`, or `undefined`.
 * @param options - Optional overrides for currency code and locale.
 * @returns Compact currency string or `INVALID_VALUE_FALLBACK` on error.
 *
 * @example
 * formatCurrencyCompact(1_500_000_000)              // "1.5B USD"
 * formatCurrencyCompact(45_000, { currency: "EUR" }) // "45K EUR"
 * formatCurrencyCompact(500)                        // "$500"
 */
export function formatCurrencyCompact(
  value: NumericInput,
  options: CurrencyOptions = {}
): string {
  const { currency = FORMAT_CONFIG.currency.currency, locale = FORMAT_CONFIG.currency.locale } =
    options;

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
 * Invalid, null, undefined, or NaN values return a display-safe fallback (`"—"`).
 *
 * @param value   - The value to format. Accepts numbers, numeric strings, `null`, or `undefined`.
 * @param options - Optional overrides for locale and fraction digits.
 * @returns Formatted percentage string or `INVALID_VALUE_FALLBACK` on error.
 *
 * @example
 * formatPercent(8.2)                                           // "8.2%"
 * formatPercent(5, { minimumFractionDigits: 2 })               // "5.00%"
 * formatPercent(null)                                          // "—"
 */
export function formatPercent(value: NumericInput, options: PercentOptions = {}): string {
  const {
    locale = FORMAT_CONFIG.percentage.locale,
    minimumFractionDigits = FORMAT_CONFIG.percentage.minimumFractionDigits,
    maximumFractionDigits = FORMAT_CONFIG.percentage.maximumFractionDigits,
  } = options;

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
