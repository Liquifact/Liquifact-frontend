import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import * as policy from "../lib/pwa/policy.js";

const source = (await readFile(new URL("../public/sw.js", import.meta.url), "utf8")).replace(/^import .*;\n/gm, "");
function harness(fetch, timeout = setTimeout) {
  const stores = new Map(), listeners = {};
  const origin = "https://app.example";
  const key = (request) => new URL(typeof request === "string" ? request : request.url, origin).href;
  const caches = {
    async open(name) {
      if (!stores.has(name)) stores.set(name, new Map());
      const store = stores.get(name);
      return { match: async (request) => store.get(key(request))?.clone(), put: async (request, response) => store.set(key(request), response.clone()) };
    },
    keys: async () => [...stores.keys()], delete: async (name) => stores.delete(name),
  };
  let skipped = 0, claimed = 0;
  const self = { location: { origin }, clients: { claim: async () => { claimed++; } }, skipWaiting: () => { skipped++; }, addEventListener: (name, fn) => { listeners[name] = fn; } };
  vm.runInNewContext(source, { ...policy, API_URL: "https://api.example", VERSION: "test", self, caches, fetch, Request, Response, Headers, setTimeout: timeout, clearTimeout });
  async function request(url, options = {}) {
    const pending = []; let response;
    listeners.fetch({ request: { url, method: "GET", headers: new Headers(), mode: "cors", ...options }, waitUntil: (p) => pending.push(p), respondWith: (p) => { response = p; } });
    const result = response ? await response : null;
    return { result, settle: () => Promise.all(pending) };
  }
  return { caches, stores, listeners, request, skipped: () => skipped, claimed: () => claimed };
}

test("worker reuses last successful public response offline, never replacing it with failed refresh", async () => {
  let online = true;
  const h = harness(async () => online ? new Response('{"data":[{"id":"REAL_42","smeAddress":"SECRET"}]}') : Promise.reject(new Error("offline")));
  const url = "https://api.example/api/invoices";
  let response = await h.request(url); await response.settle();
  assert.equal(response.result.headers.has("x-liquifact-cache"), false);
  online = false;
  response = await h.request(url); await response.settle();
  assert.equal(response.result.headers.get("x-liquifact-cache"), "stale");
  assert.deepEqual(await response.result.json(), { data: [{ id: "REAL_42" }] });
});

test("worker never handles funding, escrow, Horizon or Soroban requests", async () => {
  const h = harness(() => { throw new Error("must not fetch through worker"); });
  for (const [url, method] of [
    ["https://api.example/api/invoices", "POST"], ["https://api.example/api/invoices/1/fund", "POST"],
    ["https://api.example/api/escrow/live", "GET"], ["https://horizon.stellar.org/accounts/G123", "GET"],
    ["https://soroban-testnet.stellar.org", "POST"],
  ]) assert.equal((await h.request(url, { method })).result, null);
  assert.equal(h.stores.size, 0);
});

test("navigation timeout returns saved page, unknown routes fall back to offline page", async () => {
  const h = harness(() => new Promise(() => {}), (callback) => setTimeout(callback, 1));
  const cache = await h.caches.open("liquifact-pwa-test-shell");
  await cache.put("/marketplace", new Response("saved marketplace"));
  await cache.put("/offline", new Response("friendly offline screen"));
  assert.equal(await (await h.request("https://app.example/marketplace", { mode: "navigate" })).result.text(), "saved marketplace");
  assert.equal(await (await h.request("https://app.example/not-visited", { mode: "navigate" })).result.text(), "friendly offline screen");
});

test("activation deletes only this app's old caches and skipWaiting requires consent", async () => {
  const h = harness(fetch);
  for (const name of ["liquifact-pwa-old-shell", "liquifact-pwa-test-shell", "another-app-cache"]) await h.caches.open(name);
  let done;
  h.listeners.activate({ waitUntil: (p) => { done = p; } }); await done;
  assert.deepEqual(await h.caches.keys(), ["liquifact-pwa-test-shell", "another-app-cache"]);
  assert.equal(h.claimed(), 1); assert.equal(h.skipped(), 0);
  h.listeners.message({ data: { type: "unrelated" } }); assert.equal(h.skipped(), 0);
  h.listeners.message({ data: { type: "SKIP_WAITING" } }); assert.equal(h.skipped(), 1);
});
