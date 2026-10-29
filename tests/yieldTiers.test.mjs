import { test } from "node:test";
import assert from "node:assert/strict";
import {
  fetchYieldTiers,
  previewYieldTier,
  fetchInvestorYieldBps,
  fetchContributionFor,
  u64Arg,
} from "../lib/stellar/yieldTiers.js";
import { scValToNative } from "@stellar/stellar-sdk";

const TEST_CONTRACT = "CDQCKR2YU6IVQ4GYPBMXBPZ4FGFQB5H25AI7ZSETHS2CZ5ZRCWQDSO6P";
const INVESTOR = "GA7TXEBMEPQCLHIYCWDN7RKAO5IMRD2UV7O7TZXMEW6VZUMEXNR4XBB5";

test("u64Arg builds a u64 ScVal", () => {
  const val = u64Arg(2592000n);
  assert.equal(val.type, "scvU64");
  assert.equal(scValToNative(val), 2592000n);
});

test("u64Arg from number works", () => {
  const val = u64Arg(90);
  assert.equal(val.type, "scvU64");
});

// ── fetchYieldTiers ──────────────────────────────────────────────────────

test("returns normalised tiers from get_yield_tiers", async () => {
  const call = async ({ method }) => {
    assert.equal(method, "get_yield_tiers");
    return [
      { min_lock_secs: 2592000, yield_bps: 950 },
      { min_lock_secs: 7776000, yield_bps: 1100 },
    ];
  };
  const tiers = await fetchYieldTiers({ contractId: TEST_CONTRACT, call });
  assert.equal(tiers.length, 2);
  assert.equal(tiers[0].min_lock_secs, 2592000);
  assert.equal(tiers[0].yield_bps, 950);
  assert.equal(tiers[1].min_lock_secs, 7776000);
  assert.equal(tiers[1].yield_bps, 1100);
});

test("returns empty array when call throws", async () => {
  const call = async () => { throw new Error("entrypoint not found"); };
  const tiers = await fetchYieldTiers({ contractId: TEST_CONTRACT, call });
  assert.deepEqual(tiers, []);
});

test("returns empty array when call returns non-array", async () => {
  const call = async () => ({ not: "an array" });
  const tiers = await fetchYieldTiers({ contractId: TEST_CONTRACT, call });
  assert.deepEqual(tiers, []);
});

test("handles camelCase field names from scValToNative", async () => {
  const call = async () => [
    { minLockSecs: 2592000, yieldBps: 950 },
  ];
  const tiers = await fetchYieldTiers({ contractId: TEST_CONTRACT, call });
  assert.equal(tiers[0].min_lock_secs, 2592000);
  assert.equal(tiers[0].yield_bps, 950);
});

// ── previewYieldTier ──────────────────────────────────────────────────────

test("decodes YieldResolution with effective_yield_bps and lock_end_secs", async () => {
  const call = async ({ method, args }) => {
    assert.equal(method, "preview_yield_tier");
    // Two args: i128 amount, u64 lock
    assert.equal(args.length, 2);
    return { effective_yield_bps: 950, lock_end_secs: 1733011200 };
  };
  const result = await previewYieldTier({
    contractId: TEST_CONTRACT,
    amountStroops: 10000000n,
    lockSecs: 2592000n,
    call,
  });
  assert.equal(result.effective_yield_bps, 950);
  assert.equal(result.lock_end_secs, 1733011200);
});

test("previewYieldTier passes exactly two args (amount, lock)", async () => {
  const call = async ({ method, args }) => {
    assert.equal(method, "preview_yield_tier");
    assert.equal(args.length, 2);
    return { effective_yield_bps: 950, lock_end_secs: 1733011200 };
  };
  await previewYieldTier({
    contractId: TEST_CONTRACT,
    amountStroops: 10000000n,
    lockSecs: 2592000n,
    call,
  });
});

test("previewYieldTier handles camelCase YieldResolution fields", async () => {
  const call = async () => ({ effectiveYieldBps: 1100, lockEndSecs: 1735689600 });
  const result = await previewYieldTier({
    contractId: TEST_CONTRACT,
    amountStroops: 10000000n,
    lockSecs: 7776000n,
    call,
  });
  assert.equal(result.effective_yield_bps, 1100);
  assert.equal(result.lock_end_secs, 1735689600);
});

// ── fetchInvestorYieldBps ────────────────────────────────────────────────

test("returns the yield bps as a number", async () => {
  const call = async ({ method, args }) => {
    assert.equal(method, "get_investor_yield_bps");
    assert.equal(args.length, 1);
    return 950;
  };
  const bps = await fetchInvestorYieldBps({ contractId: TEST_CONTRACT, investor: INVESTOR, call });
  assert.equal(bps, 950);
});

test("returns null on error", async () => {
  const call = async () => { throw new Error("not found"); };
  const bps = await fetchInvestorYieldBps({ contractId: TEST_CONTRACT, investor: INVESTOR, call });
  assert.equal(bps, null);
});

// ── fetchContributionFor ─────────────────────────────────────────────────

test("returns contribution as BigInt", async () => {
  const call = async ({ method, args }) => {
    assert.equal(method, "get_contribution");
    assert.equal(args.length, 1);
    return 10000000n;
  };
  const contrib = await fetchContributionFor({ contractId: TEST_CONTRACT, investor: INVESTOR, call });
  assert.equal(typeof contrib, "bigint");
  assert.equal(contrib, 10000000n);
});

test("returns 0n on error", async () => {
  const call = async () => { throw new Error("RPC error"); };
  const contrib = await fetchContributionFor({ contractId: TEST_CONTRACT, investor: INVESTOR, call });
  assert.equal(contrib, 0n);
});
