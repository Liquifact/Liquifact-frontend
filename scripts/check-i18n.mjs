import en from "../lib/i18n/dictionaries/en.js";
import es from "../lib/i18n/dictionaries/es.js";

const dicts = { en, es };
const base = new Set(Object.keys(en));
let failed = false;

for (const [name, dict] of Object.entries(dicts)) {
  const keys = new Set(Object.keys(dict));
  const missing = [...base].filter((k) => !keys.has(k));
  const extra = [...keys].filter((k) => !base.has(k));
  if (missing.length || extra.length) {
    failed = true;
    console.error(`[i18n] ${name}: missing=[${missing}] extra=[${extra}]`);
  }
}

if (failed) process.exit(1);
console.log("i18n dictionaries have identical keys");
