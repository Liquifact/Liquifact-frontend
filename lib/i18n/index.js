import en from "./dictionaries/en.js";
import es from "./dictionaries/es.js";

export const SUPPORTED_LOCALES = ["en", "es"];
export const DEFAULT_LOCALE = "en";
export const LOCALE_COOKIE = "liquifact-locale";

const DICTIONARIES = { en, es };
const warned = new Set();

export function isSupportedLocale(value) {
  return SUPPORTED_LOCALES.includes(value);
}

export function getDictionary(locale) {
  return DICTIONARIES[isSupportedLocale(locale) ? locale : DEFAULT_LOCALE];
}

function warnOnce(key) {
  if (process.env.NODE_ENV !== "development" || warned.has(key)) return;
  warned.add(key);
  console.warn(`[i18n] Missing translation key "${key}", falling back to English.`);
}

/**
 * Pick the best supported locale from an Accept-Language header value.
 * Honours q-values; matches on the primary subtag ("es-MX" -> "es").
 */
export function parseAcceptLanguage(header) {
  if (!header || typeof header !== "string") return null;
  const ranked = header
    .split(",")
    .map((part, index) => {
      const [tag, ...params] = part.trim().split(";");
      const qParam = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      const q = qParam ? Number(qParam.slice(2)) : 1;
      return { lang: tag.trim().toLowerCase().split("-")[0], q: Number.isNaN(q) ? 0 : q, index };
    })
    .filter((x) => x.lang && x.q > 0)
    .sort((a, b) => b.q - a.q || a.index - b.index);
  const match = ranked.find((x) => isSupportedLocale(x.lang));
  return match ? match.lang : null;
}

/** Locale resolution order: cookie -> Accept-Language -> default. */
export function resolveLocale({ cookie, acceptLanguage } = {}) {
  if (isSupportedLocale(cookie)) return cookie;
  return parseAcceptLanguage(acceptLanguage) || DEFAULT_LOCALE;
}

/**
 * Translate `key` using `dict`. Missing keys fall back to English.
 * - `{var}` placeholders are replaced from `vars`.
 * - A dictionary value may be a plural map ({ one, other, ... }); the form is
 *   chosen with Intl.PluralRules using `vars.count` and `vars.locale`.
 */
export function t(dict, key, vars = {}) {
  let value = dict ? dict[key] : undefined;
  if (value === undefined) {
    warnOnce(key);
    value = en[key];
  }
  if (value === undefined) return key;
  if (typeof value === "object" && value !== null) {
    const category = new Intl.PluralRules(vars.locale || DEFAULT_LOCALE).select(Number(vars.count) || 0);
    value = value[category] ?? value.other ?? "";
  }
  return String(value).replace(/\{(\w+)\}/g, (match, name) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : match,
  );
}
