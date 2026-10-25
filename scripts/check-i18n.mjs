import en from "../lib/i18n/dictionaries/en.js";
import es from "../lib/i18n/dictionaries/es.js";

const dictionaries = { en, es };
const reference = Object.keys(en).sort();
let failed = false;

for (const [name, dict] of Object.entries(dictionaries)) {
  if (name === "en") continue;
  const keys = new Set(Object.keys(dict));
  const missing = reference.filter((k) => !keys.has(k));
  const extra = [...keys].filter((k) => !(k in en));
  if (missing.length || extra.length) {
    failed = true;
    if (missing.length) console.error(`[check-i18n] "${name}" is missing keys: ${missing.join(", ")}`);
    if (extra.length) console.error(`[check-i18n] "${name}" has keys not in "en": ${extra.join(", ")}`);
  }
}

if (failed) process.exit(1);
console.log(`[check-i18n] OK — ${Object.keys(dictionaries).join(", ")} share ${reference.length} keys.`);
