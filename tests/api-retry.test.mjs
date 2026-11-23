import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { listInvoices, getInvoice, createInvoice, fundInvoice } from "../lib/api.js";

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

function sequenceFetch(responses, calls) {
  let i = 0;
  return async (url, options) => {
    calls.push({ url, options });
    const r = responses[Math.min(i++, responses.length - 1)];
    if (r instanceof Error) throw r;
    return r();
  };
}

const json = (body, init) => () => new Response(JSON.stringify(body), init);

test("transient 503 then 200 returns real data", async () => {
  const calls = [];
  globalThis.fetch = sequenceFetch([
    json({ error: "busy" }, { status: 503 }),
    json({ data: [{ id: "REAL_1" }] }),
  ], calls);
  const sleeps = [];
  const { request } = await import("../lib/api.js").then(() => ({ request: null }));
  const result = await listInvoices();
  assert.equal(calls.length, 2);
  assert.deepEqual(result.data, [{ id: "REAL_1" }]);
  assert.equal(result.offline, false);
  assert.equal(sleeps.length, 0);
});

test("network error retried then succeeds with real data", async () => {
  const calls = [];
  globalThis.fetch = sequenceFetch([
    new TypeError("socket reset"),
    json({ data: { id: "REAL_2" } }),
  ], calls);
  const result = await getInvoice("REAL_2");
  assert.equal(calls.length, 2);
  assert.deepEqual(result.data, { id: "REAL_2" });
  assert.equal(result.offline, false);
});

test("POST requests are never retried", async () => {
  const calls = [];
  globalThis.fetch = sequenceFetch([json({ error: "down" }, { status: 503 })], calls);
  await assert.rejects(createInvoice({ amount: 1 }), (err) => err.status === 503);
  assert.equal(calls.length, 1);
  calls.length = 0;
  globalThis.fetch = sequenceFetch([new TypeError("offline")], calls);
  await assert.rejects(fundInvoice("X", 1));
  assert.equal(calls.length, 1);
});

test("gives up after 2 retries (3 total attempts)", async () => {
  const calls = [];
  globalThis.fetch = sequenceFetch([json({ error: "x" }, { status: 504 })], calls);
  const result = await getInvoice("REAL_3");
  assert.equal(calls.length, 3);
  assert.equal(result.offline, true);
});

test("429 Retry-After is honored but capped at 2 s", async () => {
  const calls = [];
  globalThis.fetch = sequenceFetch([
    json({ error: "slow" }, { status: 429, headers: { "Retry-After": "120" } }),
    json({ data: [] }),
  ], calls);
  const started = Date.now();
  const result = await listInvoices();
  const elapsed = Date.now() - started;
  assert.equal(calls.length, 2);
  assert.equal(result.offline, false);
  assert.ok(elapsed >= 1900 && elapsed < 4000, `elapsed ${elapsed}ms`);
});

test("non-retryable 404 is not retried", async () => {
  const calls = [];
  globalThis.fetch = sequenceFetch([json({ error: "nf" }, { status: 404 })], calls);
  const result = await getInvoice("missing");
  assert.equal(calls.length, 1);
  assert.deepEqual(result, { data: null, offline: false });
});
