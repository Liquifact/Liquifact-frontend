import en from "./dictionaries/en.js";
import es from "./dictionaries/es.js";

export const SUPPORTED_LOCALES = ["en", "es"];
export const DEFAULT_LOCALE = "en";
export const LOCALE_COOKIE = "liquifact-locale";
export const LOCALE_NAMES = { en: "English", es: "Español" };

const DICTIONARIES = { en, es };

export function getDictionary(locale) {
  return DICTIONARIES[locale] || DICTIONARIES[DEFAULT_LOCALE];
}

function matchSupported(tag) {
  if (!tag) return null;
  const primary = String(tag).trim().toLowerCase().split("-")[0];
  return SUPPORTED_LOCALES.includes(primary) ? primary : null;
}

function fromAcceptLanguage(header) {
  if (!header) return null;
  const ranked = String(header)
    .split(",")
    .map((part, index) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      const weight = q ? Number(q.slice(2)) : 1;
      return { tag, weight: Number.isNaN(weight) ? 0 : weight, index };
    })
    .filter((e) => e.tag && e.weight > 0)
    .sort((a, b) => b.weight - a.weight || a.index - b.index);
  for (const { tag } of ranked) {
    const hit = matchSupported(tag);
    if (hit) return hit;
  }
  return null;
}

/** cookie → Accept-Language → default. */
export function resolveLocale(cookieValue, acceptLanguage) {
  const fromCookie = SUPPORTED_LOCALES.includes(cookieValue) ? cookieValue : null;
  return fromCookie || fromAcceptLanguage(acceptLanguage) || DEFAULT_LOCALE;
}

const warned = new Set();
function warnOnce(key) {
  if (process.env.NODE_ENV === "production" || warned.has(key)) return;
  warned.add(key);
  console.warn(`[i18n] missing translation for "${key}"`);
}

function interpolate(message, vars) {
  if (!vars) return message;
  return message.replace(/\{(\w+)\}/g, (m, name) => (name in vars ? String(vars[name]) : m));
}

function pick(dict, key, vars) {
  if (vars && typeof vars.count === "number") {
    const category = new Intl.PluralRules(dict["meta.locale"] || DEFAULT_LOCALE).select(vars.count);
    return dict[`${key}.${category}`] ?? dict[`${key}.other`] ?? dict[key];
  }
  return dict[key];
}

/** Translate `key` using `dict`; `{var}` interpolation, plurals via `vars.count` (`key.one` / `key.other`…). */
export function t(dict, key, vars) {
  let message = pick(dict, key, vars);
  if (message === undefined) {
    warnOnce(key);
    message = pick(en, key, vars);
    if (message === undefined) return key;
  }
  return interpolate(message, vars);
}
