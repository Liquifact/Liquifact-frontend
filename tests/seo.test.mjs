import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { invoiceJsonLd, invoiceMeta, stringifyJsonLd } from "../lib/seo.js";
import { fetchInvoiceById, fetchInvoicesForSitemap, isCancelledInvoice } from "../lib/invoiceSeoData.js";
import sitemap from "../app/sitemap.js";
import robots from "../app/robots.js";

const invoice = { id: "INV_0002", sme: "Northwind Textiles", amount: 25000, currency: "USDC", yieldBps: 650, fundedAmount: 18000, status: "open" };
const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("invoiceMeta builds canonical, Open Graph and Twitter metadata", () => {
  const meta = invoiceMeta(invoice);
  assert.ok(meta.title.includes("INV_0002 · Northwind Textiles"));
  assert.ok(meta.title.includes("25,000 USDC at 6.50%, 72% funded"), meta.title);
  assert.ok(meta.description.length <= 160);
  assert.equal(meta.alternates.canonical, "/marketplace/INV_0002");
  assert.equal(meta.openGraph.images[0].url, "/marketplace/INV_0002/opengraph-image");
  assert.equal(meta.twitter.card, "summary_large_image");
  assert.equal(meta.robots, undefined);
});

test("invoiceMeta marks missing invoices as non-indexable", () => {
  const meta = invoiceMeta(null, "missing/id");
  assert.deepEqual(meta.robots, { index: false });
  assert.equal(meta.alternates.canonical, "/marketplace/missing%2Fid");
});

test("invoiceMeta strips markup from untrusted text", () => {
  const meta = invoiceMeta({ ...invoice, sme: "<b>Northwind</b>" });
  assert.ok(!meta.title.includes("<"));
  assert.ok(meta.title.includes("Northwind"));
});

test("JSON-LD escapes script-sensitive characters", () => {
  const raw = stringifyJsonLd(invoiceJsonLd({ ...invoice, sme: '</script><script>alert("x")</script>Northwind & Co' }));
  assert.ok(!raw.includes("<script>"));
  assert.ok(!raw.includes("&"));
  assert.equal(JSON.parse(raw).seller.name, 'alert("x")Northwind & Co');
  assert.equal(JSON.parse(raw)["@type"], "Offer");
});

test("fetchInvoiceById uses a revalidated, timeout-bounded request", async () => {
  const calls = [];
  const fetchFn = async (url, opts) => {
    calls.push([url, opts]);
    return { ok: true, status: 200, json: async () => ({ data: { id: "INV_0002", sme: "Northwind Textiles" } }) };
  };
  const inv = await fetchInvoiceById("INV_0002", { fetchFn });
  assert.equal(inv.sme, "Northwind Textiles");
  assert.ok(calls[0][0].endsWith("/api/invoices/INV_0002"));
  assert.deepEqual(calls[0][1].next, { revalidate: 60 });
  assert.equal(calls[0][1].signal.aborted, false);
});

test("fetchInvoiceById falls back to demo data, and 404 means not found", async () => {
  const down = async () => {
    throw new Error("API unavailable");
  };
  assert.equal((await fetchInvoiceById("INV_0002", { fetchFn: down })).id, "INV_0002");
  assert.equal(await fetchInvoiceById("unknown", { fetchFn: down }), null);
  assert.equal(await fetchInvoiceById("INV_0002", { fetchFn: async () => ({ ok: false, status: 404 }) }), null);
});

test("sitemap lists invoice pages and omits cancelled invoices", async () => {
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({ data: [{ id: "INV_A", status: "open", createdAt: "2026-01-01T00:00:00Z" }, { id: "INV_B", status: "cancelled" }] }),
  });
  const urls = (await sitemap()).map((e) => e.url);
  assert.ok(urls.some((u) => u.endsWith("/marketplace")));
  assert.ok(!urls.some((u) => u.endsWith("/portfolio")));
  assert.ok(urls.some((u) => u.endsWith("/marketplace/INV_A")));
  assert.ok(!urls.some((u) => u.endsWith("/marketplace/INV_B")));
});

test("sitemap falls back to demo invoices when the API is down", async () => {
  globalThis.fetch = async () => {
    throw new Error("down");
  };
  const invoices = await fetchInvoicesForSitemap();
  assert.ok(invoices.length > 0);
  assert.equal(isCancelledInvoice({ status: "Cancelled" }), true);
});

test("robots publishes the sitemap and host", () => {
  const r = robots();
  assert.ok(r.sitemap.endsWith("/sitemap.xml"));
  assert.ok(r.host.length > 0);
});
