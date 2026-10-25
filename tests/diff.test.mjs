import { test } from "node:test";
import assert from "node:assert/strict";
import { diffInvoices, fundedPercentOf, relativeTime } from "../lib/notifications/diff.js";

const inv = (id, status, fundedAmount, amount = 100) => ({
  id,
  status,
  fundedAmount,
  amount,
});

test("fundedPercentOf clamps to 0-100", () => {
  assert.equal(fundedPercentOf({ amount: 100, fundedAmount: 50 }), 50);
  assert.equal(fundedPercentOf({ amount: 100, fundedAmount: 200 }), 100);
  assert.equal(fundedPercentOf(null), 0);
  assert.equal(fundedPercentOf(undefined), 0);
});

test("detects open -> funded transition", () => {
  const prev = { INV_0001: inv("INV_0001", "open", 0) };
  const current = [inv("INV_0001", "funded", 100)];
  const events = diffInvoices(prev, current, ["INV_0001"]);
  assert.deepEqual(events, [
    { id: "INV_0001", type: "funded", from: "open", to: "funded", at: events[0].at },
  ]);
});

test("detects funded -> settled transition", () => {
  const prev = { INV_0003: inv("INV_0003", "funded", 42000) };
  const current = [inv("INV_0003", "settled", 42000)];
  const events = diffInvoices(prev, current, ["INV_0003"]);
  assert.equal(events.length, 1);
  assert.equal(events[0].type, "settled");
  assert.equal(events[0].from, "funded");
  assert.equal(events[0].to, "settled");
});

test("detects cancellation while still listed", () => {
  const prev = { INV_0001: inv("INV_0001", "open", 0) };
  const current = [inv("INV_0001", "cancelled", 0)];
  const events = diffInvoices(prev, current, ["INV_0001"]);
  assert.equal(events[0].type, "cancelled");
  assert.equal(events[0].to, "cancelled");
});

test("detects invoice disappearing", () => {
  const prev = { INV_0002: inv("INV_0002", "open", 18000, 25000) };
  const current = [];
  const events = diffInvoices(prev, current, ["INV_0002"]);
  assert.equal(events.length, 1);
  assert.equal(events[0].type, "cancelled");
  assert.equal(events[0].to, "removed");
  assert.equal(events[0].from, "open");
});

test("ignores unfollowed invoices", () => {
  const prev = { INV_0001: inv("INV_0001", "open", 0), INV_0002: inv("INV_0002", "funded", 25000) };
  const current = [inv("INV_0001", "settled", 100), inv("INV_0002", "cancelled", 25000)];
  const events = diffInvoices(prev, current, ["INV_0002"]);
  assert.equal(events.length, 1);
  assert.equal(events[0].id, "INV_0002");
  assert.equal(events[0].type, "cancelled");
});

test("no duplicate events on repeated polls (snapshot advances)", () => {
  // First poll moves 0 -> 60% (crosses 25 and 50 but no duplicate across polls).
  const prev = { INV_0002: inv("INV_0002", "open", 0, 25000) };
  const current = [inv("INV_0002", "open", 15000, 25000)]; // 60%
  let events = diffInvoices(prev, current, ["INV_0002"]);
  assert.equal(events.length, 1);
  assert.equal(events[0].type, "progress");

  // Second poll: 60% -> 80% (crosses 75 only).
  const prev2 = { INV_0002: inv("INV_0002", "open", 15000, 25000) };
  const current2 = [inv("INV_0002", "open", 20000, 25000)]; // 80%
  events = diffInvoices(prev2, current2, ["INV_0002"]);
  assert.equal(events.length, 1);
  assert.equal(events[0].type, "progress");

  // Third poll: no change -> no events.
  const prev3 = { INV_0002: inv("INV_0002", "open", 20000, 25000) };
  const current3 = [inv("INV_0002", "open", 20000, 25000)];
  events = diffInvoices(prev3, current3, ["INV_0002"]);
  assert.deepEqual(events, []);
});

test("progress crosses each threshold once", () => {
  const prev = { INV_0002: inv("INV_0002", "open", 0, 25000) };
  const current = [inv("INV_0002", "open", 25000, 25000)]; // 0 -> 100 crosses 25,50,75,100
  const events = diffInvoices(prev, current, ["INV_0002"]);
  assert.equal(events.length, 1);
  assert.equal(events[0].type, "progress");
});

test("does not emit progress when crossing backwards", () => {
  const prev = { INV_0002: inv("INV_0002", "open", 20000, 25000) }; // 80%
  const current = [inv("INV_0002", "open", 10000, 25000)]; // 40% (crosses nothing downwards)
  const events = diffInvoices(prev, current, ["INV_0002"]);
  assert.deepEqual(events, []);
});

test("emits nothing when no followed invoices", () => {
  const prev = { INV_0001: inv("INV_0001", "open", 0) };
  const current = [inv("INV_0001", "funded", 100)];
  assert.deepEqual(diffInvoices(prev, current, []), []);
});

test("emits nothing when prev snapshot is empty", () => {
  const current = [inv("INV_0001", "funded", 100)];
  assert.deepEqual(diffInvoices({}, current, ["INV_0001"]), []);
});

test("at is an ISO timestamp", () => {
  const prev = { INV_0001: inv("INV_0001", "open", 0) };
  const current = [inv("INV_0001", "funded", 100)];
  const events = diffInvoices(prev, current, ["INV_0001"]);
  assert.equal(typeof events[0].at, "string");
  assert.equal(new Date(events[0].at).getTime(), new Date(events[0].at).getTime());
});

test("relativeTime formats", () => {
  const now = Date.now();
  assert.equal(relativeTime(now - 5000), "5 seconds ago");
  assert.equal(relativeTime(now - 90000), "1 minute ago");
  assert.equal(relativeTime(now - 3_600_000), "1 hour ago");
  assert.equal(relativeTime(now - 90_000_000), "1 day ago");
  assert.equal(relativeTime(now - 5000), "5 seconds ago");
  assert.equal(relativeTime("not-a-date"), "");
  assert.equal(relativeTime(now - 500), "just now");
});
