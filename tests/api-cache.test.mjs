import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { listInvoices, getInvoice, getStats, fundInvoice } from "../lib/api.js";

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
test("list/detail propagate stale real data and timestamp rather than demo invoices", async () => {
  const data = { id: "REAL_42", sme: "Most recent invoice" };
  globalThis.fetch = async (url) => new Response(JSON.stringify({ data: url.endsWith("REAL_42") ? data : [data] }), {
    headers: { "x-liquifact-cache": "stale", "x-liquifact-cached-at": "2026-10-19T10:42:00Z" },
  });
  assert.deepEqual(await listInvoices(), { data: [data], offline: true, stale: true, cachedAt: "2026-10-19T10:42:00Z" });
  assert.deepEqual(await getInvoice("REAL_42"), { data, offline: true, stale: true, cachedAt: "2026-10-19T10:42:00Z" });
});
test("fresh responses, uncached demo fallback and 404 preserve existing behavior", async () => {
  globalThis.fetch = async () => new Response('{"data":[]}');
  assert.deepEqual(await listInvoices(), { data: [], offline: false, stale: false, cachedAt: null });
  globalThis.fetch = async () => { throw new TypeError("offline"); };
  const fallback = await listInvoices("open");
  assert.equal(fallback.offline, true);
  assert.equal(fallback.stale, undefined);
  assert.ok(fallback.data.length > 0);
  assert.ok(fallback.data.every((invoice) => invoice.status === "open"));
  globalThis.fetch = async () => new Response('{"error":"not found"}', { status: 404 });
  assert.deepEqual(await getInvoice("missing"), { data: null, offline: false });
});
test("stats and mutation callers retain their response shapes", async () => {
  globalThis.fetch = async (_url, options) => new Response(JSON.stringify(options.method === "POST" ? { data: { amount: 2 } } : { invoices: 1 }));
  assert.deepEqual(await getStats(), { invoices: 1 });
  assert.deepEqual(await fundInvoice("REAL_42", 2), { data: { amount: 2 } });
});
