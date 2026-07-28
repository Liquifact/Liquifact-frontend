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

/**
 * Breakpoints used by formatRelativeTime, ordered smallest to largest.
 * `secondsInUnit` converts a second-delta into a count of that unit; `max` is the
 * second-delta threshold below which this unit applies (exclusive upper bound).
 * @type {ReadonlyArray<{unit: Intl.RelativeTimeFormatUnit, secondsInUnit: number, max: number}>}
 */
const RELATIVE_TIME_UNITS = Object.freeze([
  { unit: "second", secondsInUnit: 1, max: 60 },
  { unit: "minute", secondsInUnit: 60, max: 3600 },
  { unit: "hour", secondsInUnit: 3600, max: 86400 },
  { unit: "day", secondsInUnit: 86400, max: 604800 },
  { unit: "week", secondsInUnit: 604800, max: 2629800 },
  { unit: "month", secondsInUnit: 2629800, max: 31557600 },
  { unit: "year", secondsInUnit: 31557600, max: Infinity },
]);

/**
 * Formats how long ago (or, in principle, from now) a value is, e.g. "5 minutes ago".
 * Backed by the built-in Intl.RelativeTimeFormat, so wording stays correct across
 * locales/plurals without hand-rolled pluralisation. Values under a minute collapse
 * to "just now" rather than "0 minutes ago" / "in 12 seconds".
 *
 * Accepts the same input shapes as formatInvoiceDate (ISO strings, Date objects,
 * Unix ms timestamps). Returns INVALID_DATE_FALLBACK for invalid or missing values.
 *
 * @param {string|Date|number|null|undefined} value  – the timestamp to describe
 * @param {object} [options]
 * @param {string} [options.locale='en-US']
 * @param {Date|number} [options.now]  – reference "current" time; defaults to `new Date()`.
 *   Pass a fixed value in tests to keep results deterministic.
 * @returns {string}
 */
export function formatRelativeTime(value, { locale = DEFAULT_LOCALE, now } = {}) {
  if (value === null || value === undefined || value === "") {
    return INVALID_DATE_FALLBACK;
  }

  let date;
  if (value instanceof Date) {
    date = value;
  } else if (typeof value === "number" || typeof value === "string") {
    date = new Date(value);
  } else {
    return INVALID_DATE_FALLBACK;
  }

  if (isNaN(date.getTime())) {
    return INVALID_DATE_FALLBACK;
  }

  const reference = now instanceof Date ? now : now !== undefined ? new Date(now) : new Date();
  if (isNaN(reference.getTime())) {
    return INVALID_DATE_FALLBACK;
  }

  const diffSeconds = (date.getTime() - reference.getTime()) / 1000;
  const absSeconds = Math.abs(diffSeconds);

  if (absSeconds < 60) {
    return "just now";
  }

  try {
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
    const entry =
      RELATIVE_TIME_UNITS.find((candidate) => absSeconds < candidate.max) ??
      RELATIVE_TIME_UNITS[RELATIVE_TIME_UNITS.length - 1];
    return rtf.format(Math.round(diffSeconds / entry.secondsInUnit), entry.unit);
  } catch {
    return INVALID_DATE_FALLBACK;
  }
}

export { INVALID_DATE_FALLBACK };
