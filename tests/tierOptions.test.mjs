import { test } from "node:test";
import assert from "node:assert/strict";
import {
  tierOptions,
  shouldShowTierSelector,
  formatLockDuration,
} from "../lib/invest/tierOptions.js";

const NOW = 1_730_419_200; // 2024-11-01T00:00:00Z
const MATURITY = NOW + 120 * 86400; // 120 days from now

const TWO_TIERS = [
  { min_lock_secs: 30 * 86400, yield_bps: 950 }, // 30 days -> 9.50%
  { min_lock_secs: 90 * 86400, yield_bps: 1100 }, // 90 days -> 11.00%
];

test("empty table yields only the base option", () => {
  const opts = tierOptions({ tiers: [], baseYieldBps: 800, nowSec: NOW, maturitySec: MATURITY });
  assert.equal(opts.length, 1);
  assert.equal(opts[0].lockSecs, 0);
  assert.equal(opts[0].yieldBps, 800);
  assert.equal(opts[0].disabled, false);
  assert.match(opts[0].label, /8\.00%/);
  assert.match(opts[0].label, /No lock/);
});

test("null tiers yields only the base option", () => {
  const opts = tierOptions({ tiers: null, baseYieldBps: 800, nowSec: NOW, maturitySec: MATURITY });
  assert.equal(opts.length, 1);
});

test("base option is always first, then tiers in contract order", () => {
  const opts = tierOptions({ tiers: TWO_TIERS, baseYieldBps: 800, nowSec: NOW, maturitySec: MATURITY });
  assert.equal(opts.length, 3);
  assert.equal(opts[0].lockSecs, 0);
  assert.equal(opts[0].yieldBps, 800);
  assert.equal(opts[1].lockSecs, 30 * 86400);
  assert.equal(opts[1].yieldBps, 950);
  assert.equal(opts[2].lockSecs, 90 * 86400);
  assert.equal(opts[2].yieldBps, 1100);
});

test("tiers within maturity are enabled", () => {
  const opts = tierOptions({ tiers: TWO_TIERS, baseYieldBps: 800, nowSec: NOW, maturitySec: MATURITY });
  assert.equal(opts[1].disabled, false);
  assert.equal(opts[1].reason, null);
  assert.equal(opts[2].disabled, false);
  assert.equal(opts[2].reason, null);
  // 30 + 90 = 120 days, maturity is 120 days -> both fit
});

test("tier beyond maturity is disabled with reason", () => {
  const maturity = NOW + 60 * 86400; // only 60 days
  const opts = tierOptions({ tiers: TWO_TIERS, baseYieldBps: 800, nowSec: NOW, maturitySec: maturity });
  assert.equal(opts[1].disabled, false); // 30 days fits in 60
  assert.equal(opts[2].disabled, true); // 90 days exceeds 60
  assert.ok(opts[2].reason);
  assert.match(opts[2].reason, /maturity/i);
});

test("exact boundary now + lock == maturity is allowed (not disabled)", () => {
  const maturity = NOW + 90 * 86400; // exactly 90 days
  const opts = tierOptions({ tiers: TWO_TIERS, baseYieldBps: 800, nowSec: NOW, maturitySec: maturity });
  assert.equal(opts[2].lockSecs, 90 * 86400);
  assert.equal(opts[2].disabled, false, "boundary should be allowed");
  assert.equal(opts[2].reason, null);
});

test("one second beyond the boundary is disabled", () => {
  const maturity = NOW + 90 * 86400 - 1; // 1 second short of 90 days
  const opts = tierOptions({ tiers: TWO_TIERS, baseYieldBps: 800, nowSec: NOW, maturitySec: maturity });
  assert.equal(opts[2].disabled, true);
});

test("null maturitySec disables the maturity check entirely", () => {
  const opts = tierOptions({ tiers: TWO_TIERS, baseYieldBps: 800, nowSec: NOW, maturitySec: null });
  for (const o of opts) assert.equal(o.disabled, false);
});

test("labels include the yield percentage and lock duration", () => {
  const opts = tierOptions({ tiers: TWO_TIERS, baseYieldBps: 800, nowSec: NOW, maturitySec: MATURITY });
  assert.match(opts[0].label, /8\.00%/);
  assert.match(opts[1].label, /9\.50%/);
  assert.match(opts[1].label, /30 days/);
  assert.match(opts[2].label, /11\.00%/);
  assert.match(opts[2].label, /90 days/);
});

test("formatLockDuration handles edge cases", () => {
  assert.equal(formatLockDuration(0), "0 days");
  assert.equal(formatLockDuration(86400), "1 day");
  assert.equal(formatLockDuration(2 * 86400), "2 days");
  assert.equal(formatLockDuration(30 * 86400), "30 days");
  assert.equal(formatLockDuration(2_592_000), "30 days");
  assert.equal(formatLockDuration(90 * 86400), "90 days");
});

// ── shouldShowTierSelector ────────────────────────────────────────────────

test("shouldShowTierSelector true for tiers with zero contribution", () => {
  assert.equal(shouldShowTierSelector(TWO_TIERS, 0n), true);
  assert.equal(shouldShowTierSelector(TWO_TIERS, 0), true);
});

test("shouldShowTierSelector false for null/empty tiers", () => {
  assert.equal(shouldShowTierSelector(null, 0n), false);
  assert.equal(shouldShowTierSelector([], 0n), false);
  assert.equal(shouldShowTierSelector(undefined, 0n), false);
});

test("shouldShowTierSelector false when contribution > 0 (returning investor)", () => {
  assert.equal(shouldShowTierSelector(TWO_TIERS, 10000000n), false);
  assert.equal(shouldShowTierSelector(TWO_TIERS, 1n), false);
});
