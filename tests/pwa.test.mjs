import { test } from "node:test";
import assert from "node:assert/strict";
import { routeFor, isCacheableApi, isPublicNavigation, publicApiBody, cacheableApiResponse, staleResponse } from "../lib/pwa/policy.js";

const origin = "https://app.example";
const apiUrl = "https://api.example";
const context = { origin, apiUrl };
const route = (url, method = "GET", mode = "cors", headers = new Headers()) => routeFor({ url, method, mode, headers }, context);

test("only public invoice list, status filters, detail and stats use API caching", () => {
  for (const path of ["/api/invoices", "/api/invoices?status=open", "/api/invoices/INV_123", "/api/stats"]) {
    assert.equal(isCacheableApi(apiUrl + path, apiUrl), true);
    assert.equal(route(apiUrl + path), "api");
  }
  assert.equal(isCacheableApi("https://api.example/base/api/invoices", "https://api.example/base"), true);
  assert.equal(isCacheableApi("https://api.example/api/invoices", "https://api.example/base"), false);
});

test("POSTs, escrow, Horizon, RPC, credentials and unapproved query parameters bypass caches", () => {
  for (const method of ["POST", "PUT", "PATCH", "DELETE"]) assert.equal(route(apiUrl + "/api/invoices", method), "network");
  for (const url of [
    apiUrl + "/api/invoices/INV_123/fund", apiUrl + "/api/escrow/live", apiUrl + "/api/invoices-export",
    apiUrl + "/api/invoices?wallet=GSECRET", apiUrl + "/api/invoices/INV_123?address=GSECRET",
    apiUrl + "/api/stats?token=private", "https://horizon.stellar.org/api/invoices",
    "https://soroban-testnet.stellar.org/api/invoices", "https://api.example.evil.test/api/invoices",
  ]) assert.equal(route(url), "network", url);
  assert.equal(route(apiUrl + "/api/invoices", "GET", "cors", new Headers({ Authorization: "Bearer secret" })), "network");
});

test("Next static assets are cache-first; RSC and other origins are never navigation HTML", () => {
  assert.equal(route(origin + "/_next/static/chunk.js"), "static");
  assert.equal(route(origin + "/marketplace", "GET", "navigate"), "navigation");
  assert.equal(route(origin + "/marketplace?_rsc=abc"), "network");
  assert.equal(route("https://other.example/_next/static/chunk.js"), "network");
  assert.equal(isPublicNavigation(origin + "/marketplace/INV_123", origin), true);
  assert.equal(isPublicNavigation(origin + "/marketplace?wallet=GSECRET", origin), false);
  assert.equal(isPublicNavigation(origin + "/submit", origin), false);
});

test("cached JSON contains no wallet, XDR, funding or unknown fields", () => {
  const invoice = { id: "INV_123", sme: "Fresh company", amount: 42, smeAddress: "GSECRET", wallet: "GSECRET", signedXdr: "SECRET", contributions: [{ address: "GSECRET" }] };
  assert.deepEqual(publicApiBody({ data: [invoice], token: "SECRET" }, apiUrl + "/api/invoices"), { data: [{ id: "INV_123", sme: "Fresh company", amount: 42 }] });
  assert.deepEqual(publicApiBody({ data: invoice }, apiUrl + "/api/invoices/INV_123"), { data: { id: "INV_123", sme: "Fresh company", amount: 42 } });
  assert.deepEqual(publicApiBody({ invoices: 2, open: 1, wallets: ["SECRET"] }, apiUrl + "/api/stats"), { invoices: 2, open: 1 });
});

test("wallet addresses cannot become cache keys or survive inside display fields", () => {
  const wallet = "G" + "A".repeat(55);
  assert.equal(isCacheableApi(`${apiUrl}/api/invoices/${wallet}`, apiUrl), false);
  assert.equal(isPublicNavigation(`${origin}/marketplace/${wallet}`, origin), false);
  assert.equal(route(`${origin}/_next/static/test.js?wallet=${wallet}`), "network");
  assert.deepEqual(publicApiBody({ data: { id: "INV_1", sme: `Contact ${wallet}` } }, `${apiUrl}/api/invoices/INV_1`), { data: { id: "INV_1" } });
});

test("only successful JSON is stored, with an acquisition timestamp; stale clone preserves body", async () => {
  const url = apiUrl + "/api/invoices";
  for (const response of [new Response("{}", { status: 404 }), new Response("{}", { status: 500 }), new Response("not JSON")]) {
    assert.equal(await cacheableApiResponse(response, url), null);
  }
  const response = new Response(JSON.stringify({ data: [{ id: "INV_123", smeAddress: "SECRET" }] }));
  const safe = await cacheableApiResponse(response, url, Date.UTC(2026, 9, 19, 10, 42));
  const stale = staleResponse(safe);
  assert.equal(stale.headers.get("x-liquifact-cache"), "stale");
  assert.equal(stale.headers.get("x-liquifact-cached-at"), "2026-10-19T10:42:00.000Z");
  assert.equal(safe.headers.has("x-liquifact-cache"), false);
  assert.deepEqual(await stale.json(), { data: [{ id: "INV_123" }] });
  assert.deepEqual(await response.json(), { data: [{ id: "INV_123", smeAddress: "SECRET" }] });
});
