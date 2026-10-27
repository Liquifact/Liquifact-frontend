import test from "node:test";
import assert from "node:assert/strict";
import { nativeToScVal, scValToNative } from "@stellar/stellar-sdk";
import { deriveClaimUi, formatCountdown, loadClaimState, STATUS_SETTLED } from "../lib/escrow/claim.js";
import { simulateRead, SimulationError } from "../lib/stellar/simulate.js";

const CONTRACT = "CDQCKR2YU6IVQ4GYPBMXBPZ4FGFQB5H25AI7ZSETHS2CZ5ZRCWQDSO6P";
const INVESTOR = "GAIE4IHLNGMX2ZGURV2DZEAFFU6P3X7UPFNRSGRZI2QUD2IU4GVOMKIV";

const settled = (overrides = {}) => ({
  status: STATUS_SETTLED,
  amount: 125_000_000n,
  claimed: false,
  unlockAt: 0,
  legalHold: false,
  paused: false,
  ...overrides,
});

// ── deriveClaimUi ────────────────────────────────────────────────────────────

test("deriveClaimUi: claimable when settled, unclaimed, unlocked and unblocked", () => {
  assert.deepEqual(deriveClaimUi(settled(), 1_000), {
    kind: "claimable", amount: 125_000_000n, unlockAt: null, reason: null,
  });
});

test("deriveClaimUi: not-settled for any other escrow status", () => {
  for (const status of [0, 1, 3, 4, -1]) {
    assert.equal(deriveClaimUi(settled({ status }), 1_000).kind, "not-settled", `status ${status}`);
  }
});

test("deriveClaimUi: claimed once is_investor_claimed is true", () => {
  assert.equal(deriveClaimUi(settled({ claimed: true, amount: 0n }), 1_000).kind, "claimed");
});

test("deriveClaimUi: zero payout is nothing", () => {
  assert.equal(deriveClaimUi(settled({ amount: 0n }), 1_000).kind, "nothing");
});

test("deriveClaimUi: legal hold and pause block with a reason", () => {
  const hold = deriveClaimUi(settled({ legalHold: true }), 1_000);
  assert.equal(hold.kind, "blocked");
  assert.match(hold.reason, /legal hold/i);
  const paused = deriveClaimUi(settled({ paused: true }), 1_000);
  assert.equal(paused.kind, "blocked");
  assert.match(paused.reason, /paused/i);
});

test("deriveClaimUi: exact lock boundary", () => {
  const unlockAt = 1_800_000_000;
  const before = deriveClaimUi(settled({ unlockAt }), unlockAt - 1);
  assert.equal(before.kind, "locked");
  assert.equal(before.unlockAt, unlockAt);
  assert.equal(deriveClaimUi(settled({ unlockAt }), unlockAt).kind, "claimable");
});

test("formatCountdown", () => {
  assert.equal(formatCountdown(30), "less than a minute");
  assert.equal(formatCountdown(90_061), "1d 1h 1m");
  assert.equal(formatCountdown(-5), "less than a minute");
});

// ── loadClaimState ───────────────────────────────────────────────────────────

test("loadClaimState reads all six entrypoints and normalises them", async () => {
  const calls = [];
  const answers = {
    get_claimable_payout: 2n ** 60n,
    is_investor_claimed: false,
    get_investor_claim_not_before: 1_800_000_000n,
    get_legal_hold: false,
    is_paused: true,
    get_escrow: { status: 2, funded_amount: 5n },
  };
  const read = async (contractId, method, args) => {
    calls.push({ contractId, method, args: args.map((a) => scValToNative(a)) });
    return answers[method];
  };

  const state = await loadClaimState(INVESTOR, { contractId: CONTRACT, read });

  assert.deepEqual(state, {
    status: 2, amount: 2n ** 60n, claimed: false, unlockAt: 1_800_000_000, legalHold: false, paused: true,
  });
  assert.deepEqual(calls.map((c) => c.method).sort(), Object.keys(answers).sort());
  for (const c of calls) assert.equal(c.contractId, CONTRACT);
  // The investor argument is the connected address, passed to the per-investor reads only.
  assert.deepEqual(calls.find((c) => c.method === "get_claimable_payout").args, [INVESTOR]);
  assert.deepEqual(calls.find((c) => c.method === "get_legal_hold").args, []);
});

// ── simulateRead ─────────────────────────────────────────────────────────────

test("simulateRead returns an i128 above 2^53 as an exact BigInt", async () => {
  const big = 2n ** 64n + 12_345n;
  const server = {
    simulateTransaction: async () => ({ result: { retval: nativeToScVal(big, { type: "i128" }) } }),
  };
  const value = await simulateRead(CONTRACT, "get_claimable_payout", [], { server });
  assert.equal(typeof value, "bigint");
  assert.equal(value, big);
});

test("simulateRead surfaces a simulation error as a typed SimulationError", async () => {
  const server = { simulateTransaction: async () => ({ error: "HostError: Error(Contract, #127)" }) };
  await assert.rejects(
    simulateRead(CONTRACT, "get_claimable_payout", [], { server }),
    (error) => {
      assert.ok(error instanceof SimulationError);
      assert.equal(error.method, "get_claimable_payout");
      assert.match(error.message, /#127/);
      return true;
    },
  );
});
