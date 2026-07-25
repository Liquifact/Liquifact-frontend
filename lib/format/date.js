import { DEFAULT_LOCALE, INVALID_VALUE_FALLBACK as INVALID_DATE_FALLBACK } from "./config";

/**
 * Formats an invoice date value into a human-readable string.
 * Accepts ISO strings, Date objects, or Unix timestamps (ms).
 * Returns INVALID_DATE_FALLBACK for invalid or missing values.
 *
 * @param {string|Date|number|null|undefined} value
 * @param {object} [options]
 * @param {string} [options.locale='en-US']
 * @param {Intl.DateTimeFormatOptions} [options.format]
 * @returns {string}
 */
export function formatInvoiceDate(
  value,
  { locale = DEFAULT_LOCALE, format = { year: "numeric", month: "short", day: "numeric" } } = {}
) {
  if (value === null || value === undefined || value === "") {
    return INVALID_DATE_FALLBACK;
  }

  let date;

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
