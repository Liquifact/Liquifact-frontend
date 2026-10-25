/**
 * Unit tests for lib/stellar/friendbot.js
 * Run with: node --test tests/friendbot.test.mjs
 *
 * We stub global fetch using node:test mock.fn so no network calls are made.
 */

import { after, before, mock, test } from "node:test";
import assert from "node:assert/strict";
import { fundWithFriendbot } from "../lib/stellar/friendbot.js";

// ── fetch stub helpers ─────────────────────────────────────────────────────

function makeFetch(status, body) {
  return mock.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }));
}

let originalFetch;
before(() => {
  originalFetch = globalThis.fetch;
});
after(() => {
  globalThis.fetch = originalFetch;
});

// ── Network guard ──────────────────────────────────────────────────────────

test("throws immediately when network is not testnet", async () => {
  await assert.rejects(
    () => fundWithFriendbot("GABC", "mainnet"),
    /testnet/i,
  );
});

test("throws immediately when network is pubnet", async () => {
  await assert.rejects(
    () => fundWithFriendbot("GABC", "pubnet"),
    /testnet/i,
  );
});

// ── Success (HTTP 200) ─────────────────────────────────────────────────────

test("returns success on HTTP 200", async () => {
  globalThis.fetch = makeFetch(200, { hash: "abc123" });
  const result = await fundWithFriendbot(
    "GABC123",
    "testnet",
  );
  assert.equal(result.status, "success");
  assert.ok(result.message.length > 0);
});

// ── Already funded (HTTP 400 with createAccount detail) ───────────────────

test("returns already_funded for HTTP 400 with createAccount in detail", async () => {
  globalThis.fetch = makeFetch(400, {
    detail:
      'op_already_exists: account already exists (createAccount operation failed)',
  });
  const result = await fundWithFriendbot("GABC123", "testnet");
  assert.equal(result.status, "already_funded");
  assert.ok(result.message.toLowerCase().includes("already"));
});

test("returns already_funded for HTTP 400 with 'already' in detail", async () => {
  globalThis.fetch = makeFetch(400, {
    detail: "This account already exists.",
  });
  const result = await fundWithFriendbot("GABC123", "testnet");
  assert.equal(result.status, "already_funded");
});

test("returns error for HTTP 400 without known detail", async () => {
  globalThis.fetch = makeFetch(400, { detail: "some unknown error" });
  const result = await fundWithFriendbot("GABC123", "testnet");
  assert.equal(result.status, "error");
  assert.ok(result.message.length > 0);
});

// ── Rate-limited (HTTP 429) ────────────────────────────────────────────────

test("returns error for HTTP 429 rate-limited", async () => {
  globalThis.fetch = makeFetch(429, {});
  const result = await fundWithFriendbot("GABC123", "testnet");
  assert.equal(result.status, "error");
  assert.ok(result.message.toLowerCase().includes("rate"));
});

// ── Network error ──────────────────────────────────────────────────────────

test("returns error when fetch throws a network error", async () => {
  globalThis.fetch = mock.fn(async () => {
    throw new TypeError("Failed to fetch");
  });
  const result = await fundWithFriendbot("GABC123", "testnet");
  assert.equal(result.status, "error");
  assert.ok(result.message.length > 0);
});

// ── URL construction (security: only calls Friendbot with the given key) ──

test("calls Friendbot with exactly the provided address in the query string", async () => {
  const stubFetch = makeFetch(200, {});
  globalThis.fetch = stubFetch;
  const address = "GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOKY3B2WSQHG4W37";
  await fundWithFriendbot(address, "testnet");
  const calledUrl = stubFetch.mock.calls[0].arguments[0];
  assert.ok(
    calledUrl.includes(encodeURIComponent(address)),
    `Expected URL to contain encoded address, got: ${calledUrl}`,
  );
  // Must not call any URL other than the configured Friendbot endpoint
  assert.ok(
    calledUrl.startsWith("https://friendbot.stellar.org"),
    `Expected Friendbot URL, got: ${calledUrl}`,
  );
});
