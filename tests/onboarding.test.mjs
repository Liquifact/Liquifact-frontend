/**
 * Unit tests for lib/onboarding.js — pure evaluate() function.
 * Run with: node --test tests/onboarding.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { countProgress, evaluate } from "../lib/onboarding.js";
import en from "../lib/i18n/dictionaries/en.js";
import es from "../lib/i18n/dictionaries/es.js";
import { t } from "../lib/i18n/index.js";

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

test("brand-new visitor: install action is a stable link descriptor", () => {
  const steps = evaluate(state());
  assert.deepEqual(step(steps, "install").action, {
    type: "link",
    href: "https://freighter.app",
    labelKey: "getStarted.action.getFreighter",
  });
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
  assert.deepEqual(step(steps, "connect").action, {
    type: "action",
    labelKey: "getStarted.action.connect",
  });
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

test("connected-unfunded: fund step is todo with a stable Friendbot action", () => {
  const steps = evaluate(
    state({
      hasExtension: true,
      connected: true,
      networkOk: true,
      accountExists: false,
    }),
  );
  assert.equal(step(steps, "fund").status, "todo");
  assert.deepEqual(step(steps, "fund").action, {
    type: "action",
    labelKey: "getStarted.action.fund",
  });
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

test("mainnet: fund step uses the mainnet translation keys", () => {
  const steps = evaluate(
    state({
      hasExtension: true,
      connected: true,
      networkOk: false,
      network: "mainnet",
    }),
  );
  assert.equal(step(steps, "fund").titleKey, "getStarted.step.fundMainnet.title");
  assert.equal(step(steps, "fund").descriptionKey, "getStarted.step.fundMainnet.description");
  assert.ok(
    !t(en, step(steps, "fund").descriptionKey).includes("Friendbot"),
    "Mainnet fund description should not mention Friendbot",
  );
});

test("steps expose stable IDs and translation keys, not English prose", () => {
  const steps = evaluate(state({ hasExtension: true, connected: true, networkOk: true, network: "testnet" }));
  for (const s of steps) {
    assert.equal("title" in s, false);
    assert.equal("description" in s, false);
    assert.match(s.titleKey, /^getStarted\.step\.[a-zA-Z]+\.title$/);
    assert.match(s.descriptionKey, /^getStarted\.step\.[a-zA-Z]+\.description$/);
    assert.equal(typeof en[s.titleKey], "string", `missing en ${s.titleKey}`);
    assert.equal(typeof en[s.descriptionKey], "string", `missing en ${s.descriptionKey}`);
    assert.equal(typeof es[s.titleKey], "string", `missing es ${s.titleKey}`);
    assert.equal(typeof es[s.descriptionKey], "string", `missing es ${s.descriptionKey}`);
  }
  for (const s of steps) {
    if (s.action) {
      assert.equal(typeof s.action.labelKey, "string");
      assert.equal(typeof en[s.action.labelKey], "string", `missing en ${s.action.labelKey}`);
      assert.equal(typeof es[s.action.labelKey], "string", `missing es ${s.action.labelKey}`);
    }
  }
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
