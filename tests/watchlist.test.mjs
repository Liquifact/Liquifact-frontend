import test from "node:test";
import assert from "node:assert/strict";
import { buildWatchlist } from "../lib/watchlist.js";
import { createNotificationStore } from "../lib/notifications/store.js";
import { createInvoiceMonitor } from "../lib/notifications/monitor.js";

test("preserves followedIds order and deduplicates entries", () => {
  const invoices = [
    { id: "INV-1", status: "open", amount: 1000, fundedAmount: 250 },
    { id: "INV-2", status: "funded", amount: 1000, fundedAmount: 1000 },
    { id: "INV-3", status: "open", amount: 500, fundedAmount: 100 },
  ];

  const rows = buildWatchlist({
    followedIds: ["INV-3", "INV-1", "INV-3", "", null, "INV-2"],
    invoices,
    snapshot: {},
  });

  assert.deepEqual(
    rows.map((r) => r.id),
    ["INV-3", "INV-1", "INV-2"]
  );
  assert.equal(rows[0].fundedPercent, 20);
  assert.equal(rows[1].fundedPercent, 25);
  assert.equal(rows[2].fundedPercent, 100);
});

test("flags invoices missing from API as unavailable instead of dropping them", () => {
  const snapshot = {
    "INV-MISSING": {
      id: "INV-MISSING",
      debtor: "Acme Corp",
      status: "open",
      amount: 2000,
      fundedAmount: 500,
    },
  };

  const rows = buildWatchlist({
    followedIds: ["INV-OK", "INV-MISSING", "INV-NEVER-SEEN"],
    invoices: [{ id: "INV-OK", status: "open", amount: 1000, fundedAmount: 400 }],
    snapshot,
  });

  assert.equal(rows.length, 3);

  assert.equal(rows[0].id, "INV-OK");
  assert.equal(rows[0].available, true);
  assert.equal(rows[0].status, "open");

  assert.equal(rows[1].id, "INV-MISSING");
  assert.equal(rows[1].available, false);
  assert.equal(rows[1].status, "unavailable");
  assert.equal(rows[1].fundedPercent, null);
  assert.equal(rows[1].fundedDelta, null);
  assert.equal(rows[1].prevStatus, "open");
  assert.equal(rows[1].prevFundedPercent, 25);
  assert.equal(rows[1].previous.debtor, "Acme Corp");

  assert.equal(rows[2].id, "INV-NEVER-SEEN");
  assert.equal(rows[2].available, false);
  assert.equal(rows[2].status, "unavailable");
  assert.equal(rows[2].previous, null);
  assert.equal(rows[2].prevFundedPercent, null);
});

test("computes positive, zero, negative, and null funded-percent deltas vs snapshot", () => {
  const snapshot = {
    "INV-UP": { id: "INV-UP", status: "open", amount: 1000, fundedAmount: 200 },
    "INV-FLAT": { id: "INV-FLAT", status: "open", amount: 1000, fundedAmount: 500 },
    "INV-DOWN": { id: "INV-DOWN", status: "open", amount: 1000, fundedAmount: 500 },
  };
  const invoices = [
    { id: "INV-UP", status: "open", amount: 1000, fundedAmount: 550 },
    { id: "INV-FLAT", status: "open", amount: 1000, fundedAmount: 500 },
    { id: "INV-DOWN", status: "open", amount: 1000, fundedAmount: 300 },
    { id: "INV-NEW", status: "open", amount: 1000, fundedAmount: 100 },
  ];

  const rows = buildWatchlist({
    followedIds: ["INV-UP", "INV-FLAT", "INV-DOWN", "INV-NEW"],
    invoices,
    snapshot,
  });

  assert.equal(rows[0].fundedPercent, 55);
  assert.equal(rows[0].fundedDelta, 35);

  assert.equal(rows[1].fundedPercent, 50);
  assert.equal(rows[1].fundedDelta, 0);

  assert.equal(rows[2].fundedPercent, 30);
  assert.equal(rows[2].fundedDelta, -20);

  assert.equal(rows[3].fundedPercent, 10);
  assert.equal(rows[3].fundedDelta, null);
});

test("detects status changes against snapshot", () => {
  const snapshot = {
    "INV-1": { id: "INV-1", status: "open", amount: 1000, fundedAmount: 800 },
    "INV-2": { id: "INV-2", status: "funded", amount: 1000, fundedAmount: 1000 },
  };
  const invoices = [
    { id: "INV-1", status: "funded", amount: 1000, fundedAmount: 1000 },
    { id: "INV-2", status: "funded", amount: 1000, fundedAmount: 1000 },
  ];

  const rows = buildWatchlist({
    followedIds: ["INV-1", "INV-2"],
    invoices,
    snapshot,
  });

  assert.equal(rows[0].statusChanged, true);
  assert.equal(rows[0].prevStatus, "open");
  assert.equal(rows[0].status, "funded");
  assert.equal(rows[0].fundedDelta, 20);

  assert.equal(rows[1].statusChanged, false);
});

test("unfollowing removes row and stops monitor polling when none remain", () => {
  const store = createNotificationStore({ storage: null });
  let cleared = 0;
  let intervalId = 0;
  const monitor = createInvoiceMonitor({
    listInvoices: async () => ({ data: [] }),
    store,
    document: { visibilityState: "visible" },
    setTimeout: () => ++intervalId,
    clearTimeout: () => {
      cleared += 1;
    },
  });

  store.follow("INV-1");
  monitor.start();
  assert.equal(monitor.shouldPoll(), true);

  const before = buildWatchlist({
    followedIds: store.getFollowed(),
    invoices: [{ id: "INV-1", status: "open", amount: 1000, fundedAmount: 100 }],
    snapshot: store.getSnapshot(),
  });
  assert.equal(before.length, 1);

  store.unfollow("INV-1");
  monitor.start();
  assert.equal(monitor.shouldPoll(), false);
  assert.ok(cleared >= 1);

  const after = buildWatchlist({
    followedIds: store.getFollowed(),
    invoices: [{ id: "INV-1", status: "open", amount: 1000, fundedAmount: 100 }],
    snapshot: store.getSnapshot(),
  });
  assert.equal(after.length, 0);
});
