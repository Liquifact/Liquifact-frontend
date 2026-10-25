import { test } from "node:test";
import assert from "node:assert/strict";
import en from "../lib/i18n/dictionaries/en.js";
import es from "../lib/i18n/dictionaries/es.js";
import { getDictionary, parseAcceptLanguage, resolveLocale, t } from "../lib/i18n/index.js";

test("t() interpolates {var} placeholders", () => {
  assert.equal(t(en, "invoice.debtor", { name: "Acme" }), "Debtor: Acme");
  assert.equal(t(es, "invoice.debtor", { name: "Acme" }), "Deudor: Acme");
  assert.equal(t({ a: "Hi {who}, {missing}" }, "a", { who: "Ana" }), "Hi Ana, {missing}");
});

test("t() picks plural forms with Intl.PluralRules", () => {
  const dict = { items: { one: "{count} invoice", other: "{count} invoices" } };
  assert.equal(t(dict, "items", { count: 1, locale: "en" }), "1 invoice");
  assert.equal(t(dict, "items", { count: 3, locale: "en" }), "3 invoices");
  const esDict = { items: { one: "{count} factura", many: "{count} de facturas", other: "{count} facturas" } };
  assert.equal(t(esDict, "items", { count: 1, locale: "es" }), "1 factura");
  assert.equal(t(esDict, "items", { count: 1000000, locale: "es" }), "1000000 de facturas");
  assert.equal(t(esDict, "items", { count: 5, locale: "es" }), "5 facturas");
});

test("t() falls back to English for a missing key, then to the key itself", () => {
  assert.equal(t({}, "nav.home"), "Home");
  assert.equal(t({}, "does.not.exist"), "does.not.exist");
});

test("missing-key warning is logged once in development only", () => {
  const original = console.warn;
  const prevEnv = process.env.NODE_ENV;
  const calls = [];
  console.warn = (m) => calls.push(m);
  try {
    process.env.NODE_ENV = "development";
    t({}, "nav.docs");
    t({}, "nav.docs");
    assert.equal(calls.length, 1);
    process.env.NODE_ENV = "production";
    t({}, "nav.toggle");
    assert.equal(calls.length, 1);
  } finally {
    console.warn = original;
    process.env.NODE_ENV = prevEnv;
  }
});

test("dictionaries have identical key sets", () => {
  assert.deepEqual(Object.keys(es).sort(), Object.keys(en).sort());
});

test("locale resolution: cookie -> Accept-Language -> en", () => {
  assert.equal(resolveLocale({ cookie: "es", acceptLanguage: "en-US" }), "es");
  assert.equal(resolveLocale({ cookie: "fr", acceptLanguage: "es-MX,es;q=0.9" }), "es");
  assert.equal(resolveLocale({ acceptLanguage: "fr-FR,es;q=0.8,en;q=0.5" }), "es");
  assert.equal(resolveLocale({ acceptLanguage: "de,fr" }), "en");
  assert.equal(resolveLocale({}), "en");
  assert.equal(resolveLocale(), "en");
});

test("parseAcceptLanguage honours q-values and ignores q=0", () => {
  assert.equal(parseAcceptLanguage("en;q=0.4,es;q=0.9"), "es");
  assert.equal(parseAcceptLanguage("es;q=0,en"), "en");
  assert.equal(parseAcceptLanguage(""), null);
});

test("getDictionary falls back to English for unsupported locales", () => {
  assert.equal(getDictionary("es"), es);
  assert.equal(getDictionary("xx"), en);
});
