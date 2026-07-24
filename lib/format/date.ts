import { DEFAULT_LOCALE, INVALID_VALUE_FALLBACK as INVALID_DATE_FALLBACK } from "./config";

/** Accepted input types for {@link formatInvoiceDate}. */
export type DateInput = string | Date | number | null | undefined;

/** Options accepted by {@link formatInvoiceDate}. */
export interface InvoiceDateOptions {
  /** BCP 47 locale string. Defaults to `"en-US"`. */
  locale?: string;
  /** `Intl.DateTimeFormatOptions` for customizing the output format. */
  format?: Intl.DateTimeFormatOptions;
}

/** Default date display format: e.g. `"Jan 1, 2025"`. */
const DEFAULT_DATE_FORMAT: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "short",
  day: "numeric",
};

/**
 * Formats an invoice date value into a human-readable string.
 *
 * Accepts ISO strings, `Date` objects, or Unix timestamps (milliseconds).
 * Returns `INVALID_DATE_FALLBACK` for invalid or missing values.
 *
 * @param value   - The date value to format.
 * @param options - Optional locale and format overrides.
 * @returns Formatted date string or `INVALID_DATE_FALLBACK` (`"—"`) on error.
 *
 * @example
 * formatInvoiceDate("2025-01-15")                         // "Jan 15, 2025"
 * formatInvoiceDate(new Date("2025-01-15"))               // "Jan 15, 2025"
 * formatInvoiceDate(1736899200000)                        // locale-specific date
 * formatInvoiceDate(null)                                 // "—"
 * formatInvoiceDate("not-a-date")                         // "—"
 */
export function formatInvoiceDate(
  value: DateInput,
  { locale = DEFAULT_LOCALE, format = DEFAULT_DATE_FORMAT }: InvoiceDateOptions = {}
): string {
  if (value === null || value === undefined || value === "") {
    return INVALID_DATE_FALLBACK;
  }

  let date: Date;

  if (value instanceof Date) {
    date = value;
  } else if (typeof value === "number") {
    date = new Date(value);
  } else if (typeof value === "string") {
    date = new Date(value);
  } else {
    return INVALID_DATE_FALLBACK;
  }

  if (isNaN(date.getTime())) {
    return INVALID_DATE_FALLBACK;
  }

  try {
    return new Intl.DateTimeFormat(locale, format).format(date);
  } catch {
    return INVALID_DATE_FALLBACK;
  }
}

export { INVALID_DATE_FALLBACK };
