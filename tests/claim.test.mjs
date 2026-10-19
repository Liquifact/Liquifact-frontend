import { test } from "node:test";
import assert from "node:assert/strict";
import { deriveClaimUi, formatStroops, normalizeStatus } from "../lib/escrow/claim.js";
import { simulateRead, SimulationError } from "../lib/stellar/simulate.js";

const base = { status: "settled", claimable: 15_000_000n, claimed: false, notBefore: 0n, legalHold: false, paused: false };

test("deriveClaimUi covers each kind", () => {
  assert.equal(deriveClaimUi({ ...base, status: "funded" }, 100).kind, "not-settled");
  assert.equal(deriveClaimUi({ ...base, claimed: true }, 100).kind, "claimed");
  assert.equal(deriveClaimUi({ ...base, paused: true }, 100).kind, "blocked");
  assert.equal(deriveClaimUi({ ...base, legalHold: true }, 100).kind, "blocked");
  assert.equal(deriveClaimUi(base, 100).kind, "claimable");
  assert.equal(deriveClaimUi(base, 100).amount, 15_000_000n);
});

test("lock boundary is exact", () => {
  const s = { ...base, notBefore: 1000n };
  const locked = deriveClaimUi(s, 999);
  assert.equal(locked.kind, "locked");
  assert.equal(locked.unlockAt, 1000);
  assert.equal(deriveClaimUi(s, 1000).kind, "claimable");
});

test("zero payout is nothing", () => {
  assert.equal(deriveClaimUi({ ...base, claimable: 0n }, 100).kind, "nothing");
});

test("formatStroops is decimal-safe", () => {
  assert.equal(formatStroops(9007199254740993n * 10_000_000n), "9,007,199,254,740,993.0000000");
  assert.equal(formatStroops(1n), "0.0000001");
});

test("normalizeStatus handles enums and numbers", () => {
  assert.equal(normalizeStatus(["Settled"]), "settled");
  assert.equal(normalizeStatus(2), "settled");
});

function mockDeps(sim) {
  class Tx {}
  const sdk = {
    BASE_FEE: "100",
    Account: class { constructor(a, s) { this.a = a; this.s = s; } },
    Contract: class { call() { return {}; } },
    TransactionBuilder: class {
      addOperation() { return this; }
      setTimeout() { return this; }
      build() { return new Tx(); }
    },
    rpc: { Api: { isSimulationError: (s) => "error" in s } },
    scValToNative: (v) => v.native,
  };
  return { sdk, server: { simulateTransaction: async () => sim }, networkPassphrase: "x" };
}

test("simulateRead preserves i128 above 2^53", async () => {
  const big = 2n ** 80n + 7n;
  const v = await simulateRead("C1", "get_claimable_payout", [], mockDeps({ result: { retval: { native: big } } }));
  assert.equal(v, big);
});

test("simulateRead surfaces simulation errors as typed error", async () => {
  await assert.rejects(
    simulateRead("C1", "m", [], mockDeps({ error: "HostError: Error(Contract, #127)" })),
    (e) => e instanceof SimulationError && e.method === "m" && /127/.test(e.message),
  );
});
