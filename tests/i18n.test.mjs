import { test } from "node:test";
import assert from "node:assert/strict";
import en from "../lib/i18n/dictionaries/en.js";
import es from "../lib/i18n/dictionaries/es.js";
import { t, resolveLocale, getDictionary } from "../lib/i18n/index.js";
import { formatAmount, formatDate, bpsToPercent } from "../lib/format.js";

test("dictionaries have identical keys", () => {
  assert.deepEqual(Object.keys(es).sort(), Object.keys(en).sort());
});

test("t interpolates variables", () => {
  assert.equal(t(en, "invoice.debtor", { name: "Acme" }), "Debtor: Acme");
  assert.equal(t(es, "invoice.fundedAria", { pct: 40 }), "40% financiado");
});

test("t picks plural forms", () => {
  assert.equal(t(en, "marketplace.count", { count: 1 }), "1 invoice");
  assert.equal(t(en, "marketplace.count", { count: 3 }), "3 invoices");
  assert.equal(t(es, "marketplace.count", { count: 1 }), "1 factura");
  assert.equal(t(es, "marketplace.count", { count: 0 }), "0 facturas");
});

test("t falls back to English, then to the key", () => {
  const partial = { "meta.locale": "es" };
  assert.equal(t(partial, "nav.home"), "Home");
  assert.equal(t(partial, "no.such.key"), "no.such.key");
});

test("resolves locale from cookie, Accept-Language, default", () => {
  assert.equal(resolveLocale("es", "en-US"), "es");
  assert.equal(resolveLocale(undefined, "fr;q=0.9, es-MX;q=0.8"), "es");
  assert.equal(resolveLocale("de", null), "en");
  assert.equal(resolveLocale(undefined, "de"), "en");
  assert.equal(getDictionary("xx"), en);
});

test("locale-aware formatting", () => {
  assert.equal(formatAmount(25000, "USDC", "es-ES"), "25.000 USDC");
  assert.equal(formatDate("2026-12-30", "es"), "30 dic 2026");
  assert.equal(bpsToPercent(800, "es"), "8,00%");
});
