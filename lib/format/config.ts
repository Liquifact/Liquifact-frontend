/**
 * Centralized numerical format configuration object (Single Source of Truth)
 * for monetary, amount, and percentage formatting across lib/format.
 */

export interface CurrencyFormatConfig {
  readonly style: string;
  readonly currency: string;
  readonly locale: string;
  readonly minimumFractionDigits: number;
  readonly maximumFractionDigits: number;
  readonly integerMaximumFractionDigits: number;
}

export interface AmountFormatConfig {
  readonly locale: string;
  readonly minimumFractionDigits: number;
  readonly maximumFractionDigits: number;
}

export interface PercentageFormatConfig {
  readonly locale: string;
  readonly minimumFractionDigits: number;
  readonly maximumFractionDigits: number;
  readonly style: string;
  readonly suffix: string;
}

export interface FormatConfig {
  readonly defaultLocale: string;
  readonly defaultCurrency: string;
  readonly invalidValueFallback: string;
  readonly currency: CurrencyFormatConfig;
  readonly amount: AmountFormatConfig;
  readonly percentage: PercentageFormatConfig;
}

export const FORMAT_CONFIG: FormatConfig = Object.freeze({
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

export const DEFAULT_LOCALE: string = FORMAT_CONFIG.defaultLocale;
export const DEFAULT_CURRENCY: string = FORMAT_CONFIG.defaultCurrency;
export const INVALID_VALUE_FALLBACK: string = FORMAT_CONFIG.invalidValueFallback;
