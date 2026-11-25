import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import * as policy from "../lib/pwa/policy.js";
import * as lru from "../lib/pwa/lru.js";

const source = (await readFile(new URL("../public/sw.js", import.meta.url), "utf8")).replace(/^import .*;\r?\n/gm, "");
function harness(fetch, timeout = setTimeout, overrides = {}) {
  const stores = new Map(), listeners = {};
  const origin = "https://app.example";
  const key = (request) => new URL(typeof request === "string" ? request : request.url, origin).href;
  class SwRequest extends Request {
    constructor(input, init) {
      super(typeof input === "string" ? new URL(input, origin).href : input, init);
    }
  }
  const caches = {
    async open(name) {
      if (!stores.has(name)) stores.set(name, new Map());
      const store = stores.get(name);
      return {
        match: async (request) => store.get(key(request))?.clone(),
        put: async (request, response) => store.set(key(request), response.clone()),
        delete: async (request) => store.delete(key(request)),
        keys: async () => [...store.keys()].map((url) => new SwRequest(url)),
        addAll: async (requests) => {
          for (const req of requests) {
            const url = key(req);
            const res = await fetch(new SwRequest(url));
            if (!res.ok) throw new Error(`addAll failed for ${url}`);
            store.set(url, res.clone());
          }
        },
      };
    },
    keys: async () => [...stores.keys()],
    delete: async (name) => stores.delete(name),
  };
  let skipped = 0, claimed = 0;
  const self = { location: { origin }, clients: { claim: async () => { claimed++; } }, skipWaiting: () => { skipped++; }, addEventListener: (name, fn) => { listeners[name] = fn; } };
  vm.runInNewContext(source, { ...policy, ...lru, API_URL: "https://api.example", VERSION: "test", self, caches, fetch, Request: SwRequest, Response, Headers, setTimeout: timeout, clearTimeout, ...overrides });
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
  const h = harness(() => new Promise(() => { }), (callback) => setTimeout(callback, 1));
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

test("static cache evicts least recently used entries when entry cap is exceeded", async () => {
  let tick = 1000;
  const h = harness(
    async (req) => new Response(`body:${req.url}`, { headers: { "content-length": "10" } }),
    setTimeout,
    {
      STATIC_CACHE_LIMITS: { maxEntries: 2, maxBytes: 1024 },
      putAndTrimStatic: (c, u, r, l) => lru.putAndTrimStatic(c, u, r, l, { now: ++tick }),
      touchStaticEntry: (c, u) => lru.touchStaticEntry(c, u, { now: ++tick }),
    }
  );

  const a = "https://app.example/_next/static/chunks/a.js";
  const b = "https://app.example/_next/static/chunks/b.js";
  const c = "https://app.example/_next/static/chunks/c.js";

  await (await h.request(a)).settle();
  await (await h.request(b)).settle();
  // Touch A so B becomes least recently used
  await (await h.request(a)).settle();
  // Adding C should evict B, keeping A and C
  await (await h.request(c)).settle();

  const staticStore = h.stores.get("liquifact-pwa-test-static");
  assert.equal(staticStore.has(a), true);
  assert.equal(staticStore.has(b), false);
  assert.equal(staticStore.has(c), true);
});

test("static cache enforces byte cap and handles missing content-length by count only", async () => {
  let tick = 1000;
  const h = harness(
    async (req) => {
      if (req.url.includes("opaque")) {
        return { ok: true, type: "opaque", headers: new Headers(), clone() { return this; } };
      }
      return new Response("x".repeat(60), { headers: { "content-length": "60" } });
    },
    setTimeout,
    {
      STATIC_CACHE_LIMITS: { maxEntries: 5, maxBytes: 100 },
      putAndTrimStatic: (c, u, r, l) => lru.putAndTrimStatic(c, u, r, l, { now: ++tick }),
    }
  );

  const f1 = "https://app.example/_next/static/chunks/1.js";
  const f2 = "https://app.example/_next/static/chunks/2.js";
  const f3 = "https://app.example/_next/static/chunks/opaque.js";

  await (await h.request(f1)).settle(); // 60 bytes
  await (await h.request(f2)).settle(); // 120 > 100 -> evicts f1
  await (await h.request(f3)).settle(); // opaque (null bytes) -> does not evict f2

  const staticStore = h.stores.get("liquifact-pwa-test-static");
  assert.equal(staticStore.has(f1), false);
  assert.equal(staticStore.has(f2), true);
  assert.equal(staticStore.has(f3), true);
});

test("precached shell assets are never evicted during static cache trimming", async () => {
  let tick = 1000;
  const h = harness(
    async (req) => {
      const url = typeof req === "string" ? req : req.url;
      if (url.endsWith("/") || url.endsWith("/marketplace") || url.endsWith("/offline")) {
        return new Response('<script src="/_next/static/chunks/shell.js"></script>');
      }
      return new Response("asset", { headers: { "content-length": "50" } });
    },
    setTimeout,
    {
      STATIC_CACHE_LIMITS: { maxEntries: 1, maxBytes: 60 },
      putAndTrimStatic: (c, u, r, l) => lru.putAndTrimStatic(c, u, r, l, { now: ++tick }),
    }
  );

  let installed;
  h.listeners.install({ waitUntil: (p) => { installed = p; } });
  await installed;

  const r1 = "https://app.example/_next/static/chunks/runtime-1.js";
  const r2 = "https://app.example/_next/static/chunks/runtime-2.js";
  await (await h.request(r1)).settle();
  await (await h.request(r2)).settle();

  const staticStore = h.stores.get("liquifact-pwa-test-static");
  assert.equal(staticStore.has("https://app.example/_next/static/chunks/shell.js"), true);
  assert.equal(staticStore.has("https://app.example/icons/icon-192.png"), true);
  assert.equal(staticStore.has(r1), false);
  assert.equal(staticStore.has(r2), true);
});