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

/**
 * Format a past timestamp as a short relative string ("just now",
 * "5 minutes ago", "3 hours ago", "2 days ago"). Pure function so it can be
 * unit-tested with a fixed clock via the `now` parameter.
 *
 * @param {number|null|undefined} updatedAt – ms since epoch, or null/undefined
 * @param {number} [now] – ms since epoch to compare against (defaults to Date.now())
 * @returns {string|null} null when there is nothing to report yet
 */
export function formatRelativeTime(updatedAt, now = Date.now()) {
  if (updatedAt == null || !Number.isFinite(updatedAt)) return null;

  const diffSeconds = Math.max(0, Math.floor((now - updatedAt) / 1000));

  if (diffSeconds < 60) return "just now";

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
}