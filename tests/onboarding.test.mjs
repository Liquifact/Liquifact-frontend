/**
 * Unit tests for lib/onboarding.js — pure evaluate() function.
 * Run with: node --test tests/onboarding.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { countProgress, evaluate } from "../lib/onboarding.js";

// ── Helpers ────────────────────────────────────────────────────────────────

/** Merge partial state over a sensible "bare minimum" baseline. */
function state(overrides = {}) {
  return {
    hasExtension: false,
    connected: false,
    networkOk: false,
    accountExists: false,
    xlmBalance: 0,
    trustlines: [],
    network: "testnet",
    ...overrides,
  };
}

/** Find a step by id from the returned array. */
function step(steps, id) {
  return steps.find((s) => s.id === id);
}

// ── Brand-new visitor (nothing installed) ─────────────────────────────────

test("brand-new visitor: install is todo, everything else blocked", () => {
  const steps = evaluate(state());

  assert.equal(step(steps, "install").status, "todo");
  assert.equal(step(steps, "connect").status, "blocked");
  assert.equal(step(steps, "network").status, "blocked");
  assert.equal(step(steps, "fund").status, "blocked");
  assert.equal(step(steps, "trustline").status, "blocked");
});

test("brand-new visitor: install action is 'Get Freighter'", () => {
  const steps = evaluate(state());
  assert.equal(step(steps, "install").action, "Get Freighter");
});

test("brand-new visitor: no action on blocked steps", () => {
  const steps = evaluate(state());
  assert.equal(step(steps, "connect").action, null);
  assert.equal(step(steps, "fund").action, null);
});

// ── Extension installed but not connected ─────────────────────────────────

test("extension present: install is done, connect is todo", () => {
  const steps = evaluate(state({ hasExtension: true }));
  assert.equal(step(steps, "install").status, "done");
  assert.equal(step(steps, "connect").status, "todo");
  assert.equal(step(steps, "connect").action, "Connect");
});

// ── Connected but wrong network ───────────────────────────────────────────

test("connected-wrong-network: install+connect done, network+fund+trustline blocked/todo", () => {
  const steps = evaluate(
    state({ hasExtension: true, connected: true, networkOk: false }),
  );
  assert.equal(step(steps, "install").status, "done");
  assert.equal(step(steps, "connect").status, "done");
  assert.equal(step(steps, "network").status, "todo");
  assert.equal(step(steps, "fund").status, "blocked");
  assert.equal(step(steps, "trustline").status, "blocked");
});

// ── Connected + right network + account not yet funded ───────────────────

test("connected-unfunded: fund step is todo with Friendbot action", () => {
  const steps = evaluate(
    state({
      hasExtension: true,
      connected: true,
      networkOk: true,
      accountExists: false,
    }),
  );
  assert.equal(step(steps, "fund").status, "todo");
  assert.equal(step(steps, "fund").action, "Fund with Friendbot");
});

test("connected-unfunded: trustline is blocked (no account yet)", () => {
  const steps = evaluate(
    state({
      hasExtension: true,
      connected: true,
      networkOk: true,
      accountExists: false,
    }),
  );
  assert.equal(step(steps, "trustline").status, "blocked");
});

// ── Fully ready (testnet) ─────────────────────────────────────────────────

test("fully-ready: all steps are done except optional trustline", () => {
  const steps = evaluate(
    state({
      hasExtension: true,
      connected: true,
      networkOk: true,
      accountExists: true,
      xlmBalance: 10000,
      trustlines: ["USDC"],
      network: "testnet",
    }),
  );

  for (const s of steps) {
    assert.equal(
      s.status,
      "done",
      `Expected step "${s.id}" to be done, got "${s.status}"`,
    );
  }
});

test("fully-ready without USDC trustline: trustline is todo (optional)", () => {
  const steps = evaluate(
    state({
      hasExtension: true,
      connected: true,
      networkOk: true,
      accountExists: true,
      xlmBalance: 10000,
      trustlines: [],
      network: "testnet",
    }),
  );
  assert.equal(step(steps, "trustline").status, "todo");
});

// ── Mainnet: Friendbot is n/a ─────────────────────────────────────────────

test("mainnet: fund step is n/a (no Friendbot)", () => {
  const steps = evaluate(
    state({
      hasExtension: true,
      connected: true,
      networkOk: true,
      accountExists: true,
      xlmBalance: 5,
      trustlines: [],
      network: "mainnet",
    }),
  );
  assert.equal(step(steps, "fund").status, "n/a");
  assert.equal(step(steps, "fund").action, null);
});

test("mainnet: fund step description does not mention Friendbot", () => {
  const steps = evaluate(
    state({
      hasExtension: true,
      connected: true,
      networkOk: false,
      network: "mainnet",
    }),
  );
  assert.ok(
    !step(steps, "fund").description.includes("Friendbot"),
    "Mainnet fund description should not mention Friendbot",
  );
});

// ── Progress counter ──────────────────────────────────────────────────────

test("countProgress: new visitor → 0 of 5", () => {
  const steps = evaluate(state());
  const { done, total } = countProgress(steps);
  assert.equal(total, 5);
  assert.equal(done, 0);
});

test("countProgress: fully ready on testnet → 5 of 5", () => {
  const steps = evaluate(
    state({
      hasExtension: true,
      connected: true,
      networkOk: true,
      accountExists: true,
      xlmBalance: 10000,
      trustlines: ["USDC"],
      network: "testnet",
    }),
  );
  const { done, total } = countProgress(steps);
  assert.equal(done, total);
});

test("countProgress: n/a steps count as done in progress", () => {
  // On mainnet, fund = n/a; that should count toward progress
  const steps = evaluate(
    state({
      hasExtension: true,
      connected: true,
      networkOk: true,
      accountExists: true,
      xlmBalance: 5,
      trustlines: ["USDC"],
      network: "mainnet",
    }),
  );
  const { done, total } = countProgress(steps);
  assert.equal(total, 5);
  assert.equal(done, 5); // fund is n/a → counts as done
});

test("evaluate returns steps in canonical order", () => {
  const steps = evaluate(state());
  const ids = steps.map((s) => s.id);
  assert.deepEqual(ids, ["install", "connect", "network", "fund", "trustline"]);
});

test("evaluate is deterministic (same input → same output)", () => {
  const s = state({ hasExtension: true, connected: true, networkOk: true });
  const a = evaluate(s);
  const b = evaluate(s);
  assert.deepEqual(a, b);
});

test("evaluate defaults gracefully when called with no arguments", () => {
  const steps = evaluate();
  assert.equal(steps.length, 5);
  assert.equal(step(steps, "install").status, "todo");
});
