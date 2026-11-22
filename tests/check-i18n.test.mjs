import { test } from "node:test";
import assert from "node:assert/strict";
import en from "../lib/i18n/dictionaries/en.js";
import es from "../lib/i18n/dictionaries/es.js";
import { comparePlaceholders, extractPlaceholders } from "../scripts/i18n-placeholders.mjs";

test("extractPlaceholders returns sorted unique placeholder names", () => {
  assert.deepEqual(extractPlaceholders("No variables here"), []);
  assert.deepEqual(extractPlaceholders("© {year} LiquiFact"), ["year"]);
  assert.deepEqual(extractPlaceholders("Hello {name}, welcome to {city}! Bye {name}."), ["city", "name"]);
  assert.deepEqual(
    extractPlaceholders({ one: "{count} invoice for {name}", other: "{count} invoices for {name}" }),
    ["count", "name"],
  );
});

test("comparePlaceholders passes when shared keys have identical placeholder sets", () => {
  const ref = {
    "footer.legal": "© {year} LiquiFact",
    "locale.changed": "Language changed to {language}",
    "greeting.full": "Hello {first} {last}",
    "nav.home": "Home",
  };
  const target = {
    "footer.legal": "LiquiFact © {year}",
    "locale.changed": "Idioma cambiado a {language}",
    "greeting.full": "Hola {last}, {first}",
    "nav.home": "Inicio",
  };

  const result = comparePlaceholders(ref, { es: target });
  assert.equal(result.ok, true);
  assert.deepEqual(result.mismatches, []);
  assert.deepEqual(result.errors, []);
});

test("comparePlaceholders fails when a translation drops a placeholder", () => {
  const ref = {
    "footer.legal": "© {year} LiquiFact",
    "locale.changed": "Language changed to {language}",
  };
  const target = {
    "footer.legal": "© LiquiFact",
    "locale.changed": "Idioma cambiado a {language}",
  };

  const result = comparePlaceholders(ref, { es: target });
  assert.equal(result.ok, false);
  assert.equal(result.mismatches.length, 1);
  assert.equal(result.mismatches[0].key, "footer.legal");
  assert.deepEqual(result.mismatches[0].expected, ["year"]);
  assert.deepEqual(result.mismatches[0].actual, []);
  assert.match(result.mismatches[0].message, /footer\.legal/);
  assert.match(result.mismatches[0].message, /\{year\}/);
  assert.match(result.mismatches[0].message, /\(none\)/);
});

test("comparePlaceholders fails when a translation renames or adds an extra placeholder", () => {
  const ref = {
    "locale.changed": "Language changed to {language}",
    "invoice.debtor": "Debtor: {name}",
  };
  const target = {
    "locale.changed": "Idioma cambiado a {idioma}",
    "invoice.debtor": "Deudor: {name} ({company})",
  };

  const result = comparePlaceholders(ref, { es: target });
  assert.equal(result.ok, false);
  assert.equal(result.mismatches.length, 2);

  const byKey = Object.fromEntries(result.mismatches.map((m) => [m.key, m]));
  assert.deepEqual(byKey["locale.changed"].expected, ["language"]);
  assert.deepEqual(byKey["locale.changed"].actual, ["idioma"]);
  assert.match(byKey["locale.changed"].message, /locale\.changed/);
  assert.match(byKey["locale.changed"].message, /\{language\}/);
  assert.match(byKey["locale.changed"].message, /\{idioma\}/);

  assert.deepEqual(byKey["invoice.debtor"].expected, ["name"]);
  assert.deepEqual(byKey["invoice.debtor"].actual, ["company", "name"]);
  assert.match(byKey["invoice.debtor"].message, /invoice\.debtor/);
  assert.match(byKey["invoice.debtor"].message, /\{name\}/);
  assert.match(byKey["invoice.debtor"].message, /\{company\}/);
});

test("comparePlaceholders ignores non-shared keys so key-parity and placeholder-parity stay orthogonal", () => {
  const ref = {
    "shared.key": "Value {x}",
    "only.in.en": "Missing {y}",
  };
  const target = {
    "shared.key": "Valor {x}",
    "only.in.es": "Extra {z}",
  };

  const result = comparePlaceholders(ref, { es: target });
  assert.equal(result.ok, true);
  assert.deepEqual(result.mismatches, []);
});

test("comparePlaceholders accepts a single target dictionary directly", () => {
  const ref = { "invoice.fundedAria": "{pct}% funded" };
  const badTarget = { "invoice.fundedAria": "{percent}% financiado" };

  const result = comparePlaceholders(ref, badTarget);
  assert.equal(result.ok, false);
  assert.equal(result.mismatches.length, 1);
  assert.equal(result.mismatches[0].key, "invoice.fundedAria");
  assert.match(result.mismatches[0].message, /invoice\.fundedAria/);
  assert.match(result.mismatches[0].message, /\{pct\}/);
  assert.match(result.mismatches[0].message, /\{percent\}/);
});

test("current en and es dictionaries pass placeholder parity", () => {
  const result = comparePlaceholders(en, { es });
  assert.equal(result.ok, true, `Unexpected mismatches:\n${result.errors.join("\n")}`);
  assert.deepEqual(result.mismatches, []);
});
