import { test } from "node:test";
import assert from "node:assert/strict";
import { formatLockEndDate, formatLockLabel, lockEndsAt, tierOptions } from "../lib/invest/tiers.js";

const NOW = 1792430000; // fixed clock for determinism
const DAY = 86400;
const TIERS = [
  { minLockSecs: 30 * DAY, yieldBps: 950 },
  { minLockSecs: 90 * DAY, yieldBps: 1100 },
];

test("empty tier table → only the base option", () => {
  const opts = tierOptions({ tiers: [], baseYieldBps: 800, nowSec: NOW, maturitySec: NOW + 365 * DAY });
  assert.equal(opts.length, 1);
  assert.deepEqual(opts[0], {
    id: "base",
    lockSecs: 0,
    yieldBps: 800,
    label: "No lock (base 8.00%)",
    disabled: false,
    reason: null,
  });
});

test("undefined tier table behaves like empty", () => {
  const opts = tierOptions({ tiers: undefined, baseYieldBps: 650, nowSec: NOW, maturitySec: NOW + 365 * DAY });
  assert.equal(opts.length, 1);
  assert.equal(opts[0].label, "No lock (base 6.50%)");
});

test("labels match the issue format", () => {
  const opts = tierOptions({ tiers: TIERS, baseYieldBps: 800, nowSec: NOW, maturitySec: NOW + 365 * DAY });
  assert.equal(opts[0].label, "No lock (base 8.00%)");
  assert.equal(opts[1].label, "Lock 30 days → 9.50%");
  assert.equal(opts[2].label, "Lock 90 days → 11.00%");
});

test("ordering: base first, tiers ascending by lock even when input is reversed", () => {
  const opts = tierOptions({ tiers: [...TIERS].reverse(), baseYieldBps: 800, nowSec: NOW, maturitySec: NOW + 365 * DAY });
  assert.deepEqual(
    opts.map((o) => o.lockSecs),
    [0, 30 * DAY, 90 * DAY]
  );
});

test("tiers beyond maturity are disabled with a reason", () => {
  const maturitySec = NOW + 40 * DAY; // 30d fits, 90d does not
  const opts = tierOptions({ tiers: TIERS, baseYieldBps: 800, nowSec: NOW, maturitySec });
  assert.equal(opts[1].disabled, false);
  assert.equal(opts[1].reason, null);
  assert.equal(opts[2].disabled, true);
  assert.equal(typeof opts[2].reason, "string");
  assert.ok(opts[2].reason.length > 0);
});

test("exact boundary now + lock == maturity is allowed", () => {
  const maturitySec = NOW + 30 * DAY;
  const opts = tierOptions({ tiers: TIERS, baseYieldBps: 800, nowSec: NOW, maturitySec });
  assert.equal(opts[1].disabled, false, "30d lock ending exactly at maturity must be selectable");
  assert.equal(opts[2].disabled, true, "90d lock ending past maturity must be disabled");
});

test("one second past maturity is disabled", () => {
  const maturitySec = NOW + 30 * DAY - 1;
  const opts = tierOptions({ tiers: TIERS, baseYieldBps: 800, nowSec: NOW, maturitySec });
  assert.equal(opts[1].disabled, true);
});

test("formatLockLabel humanizes common lock lengths", () => {
  assert.equal(formatLockLabel(0), "no lock");
  assert.equal(formatLockLabel(86400), "1 day");
  assert.equal(formatLockLabel(2592000), "30 days");
  assert.equal(formatLockLabel(7776000), "90 days");
  assert.equal(formatLockLabel(3600), "1 hour");
  assert.equal(formatLockLabel(1800), "30 minutes");
});

test("lockEndsAt and formatLockEndDate", () => {
  assert.equal(lockEndsAt(1792430000, 2592000), 1792430000 + 2592000);
  assert.equal(formatLockEndDate(Date.UTC(2027, 0, 12) / 1000), "12 Jan 2027");
});
