const PLACEHOLDER_RE = /\{(\w+)\}/g;

/**
 * Extract sorted unique `{name}` placeholder names from a translation value.
 * Supports string values as well as plural maps (`{ one, other, ... }`).
 */
export function extractPlaceholders(value) {
  const names = new Set();
  const collect = (text) => {
    for (const match of String(text).matchAll(PLACEHOLDER_RE)) {
      names.add(match[1]);
    }
  };

  if (typeof value === "string") {
    collect(value);
  } else if (typeof value === "object" && value !== null) {
    for (const branch of Object.values(value)) {
      if (typeof branch === "string") collect(branch);
    }
  }

  return [...names].sort();
}

function formatPlaceholderSet(list) {
  return list.length ? list.map((name) => `{${name}}`).join(", ") : "(none)";
}

/**
 * Compare `{name}` placeholders across all shared keys between `referenceDict`
 * and one or more locale dictionaries (`{ es, ... }` or a single dictionary).
 *
 * Returns `{ ok, mismatches, errors }` where each mismatch records
 * `{ locale, key, expected, actual, message }`.
 */
export function comparePlaceholders(referenceDict, targetDicts, referenceName = "en") {
  const targets =
    targetDicts &&
    typeof targetDicts === "object" &&
    !Array.isArray(targetDicts) &&
    Object.values(targetDicts).every(
      (v) => typeof v === "string" || (typeof v === "object" && v !== null && ("one" in v || "other" in v)),
    )
      ? { target: targetDicts }
      : targetDicts || {};

  const refKeys = Object.keys(referenceDict || {}).sort();
  const mismatches = [];

  for (const [locale, dict] of Object.entries(targets)) {
    if (locale === referenceName || !dict) continue;
    for (const key of refKeys) {
      if (!Object.prototype.hasOwnProperty.call(dict, key)) continue;
      const expected = extractPlaceholders(referenceDict[key]);
      const actual = extractPlaceholders(dict[key]);
      if (expected.length !== actual.length || expected.some((name, i) => name !== actual[i])) {
        const message = `[check-i18n] "${locale}" key "${key}" placeholder mismatch: "${referenceName}" has [${formatPlaceholderSet(expected)}] vs "${locale}" [${formatPlaceholderSet(actual)}]`;
        mismatches.push({ locale, key, expected, actual, message });
      }
    }
  }

  return {
    ok: mismatches.length === 0,
    mismatches,
    errors: mismatches.map((m) => m.message),
  };
}
