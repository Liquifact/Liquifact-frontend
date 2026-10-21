/**
 * txStore tests — run with `npm test` (node:test).
 * Pure logic tests with injected storage (no DOM needed).
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { createTxStore, STATUS } from "../../lib/stellar/txStore.js";

// ── Mock Storage ──────────────────────────────────────────────────────────────

function createMockStorage() {
  const store = new Map();
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, value),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
  };
}

function createCorruptStorage() {
  const store = new Map();
  let isCorrupt = true;
  return {
    getItem: (key) => {
      if (isCorrupt) return "not valid json{";
      return store.get(key) ?? null;
    },
    setItem: (key, value) => {
      store.set(key, value);
      isCorrupt = false; // After successful write, storage is no longer corrupt
    },
    removeItem: (key) => store.delete(key),
    clear: () => { store.clear(); isCorrupt = true; },
  };
}

function createFailingStorage() {
  return {
    getItem: () => { throw new Error("Storage unavailable"); },
    setItem: () => { throw new Error("Storage unavailable"); },
    removeItem: () => { throw new Error("Storage unavailable"); },
    clear: () => { throw new Error("Storage unavailable"); },
  };
}

// ── Helper ────────────────────────────────────────────────────────────────────

function createStore() {
  return createTxStore(createMockStorage());
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test("txStore: add() creates a new entry with PENDING status", () => {
  const txStore = createStore();
  const entry = txStore.add({ hash: "a".repeat(64), label: "Test tx" });
  assert.equal(entry.hash, "a".repeat(64));
  assert.equal(entry.label, "Test tx");
  assert.equal(entry.status, STATUS.PENDING);
  assert.ok(entry.createdAt > 0);
});

test("txStore: add() with invoiceId stores it", () => {
  const txStore = createStore();
  const entry = txStore.add({ hash: "b".repeat(64), label: "Test", invoiceId: "INV_001" });
  assert.equal(entry.invoiceId, "INV_001");
});

test("txStore: add() with duplicate hash updates instead of duplicating", () => {
  const txStore = createStore();
  txStore.add({ hash: "c".repeat(64), label: "Original" });
  const updated = txStore.add({ hash: "c".repeat(64), label: "Updated" });
  assert.equal(updated.label, "Updated");
  const list = txStore.list();
  assert.equal(list.length, 1);
});

test("txStore: update() modifies allowed fields", () => {
  const txStore = createStore();
  txStore.add({ hash: "d".repeat(64), label: "Test" });
  const updated = txStore.update("d".repeat(64), { status: STATUS.SUCCESS, label: "New label" });
  assert.equal(updated.status, STATUS.SUCCESS);
  assert.equal(updated.label, "New label");
  assert.ok(updated.updatedAt >= updated.createdAt);
});

test("txStore: update() ignores unknown fields", () => {
  const txStore = createStore();
  txStore.add({ hash: "e".repeat(64), label: "Test" });
  const updated = txStore.update("e".repeat(64), { status: STATUS.SUCCESS, unknownField: "ignored" });
  assert.equal(updated.status, STATUS.SUCCESS);
  assert.equal(updated.unknownField, undefined);
});

test("txStore: update() returns null for non-existent hash", () => {
  const txStore = createStore();
  const result = txStore.update("nonexistent".repeat(64), { status: STATUS.SUCCESS });
  assert.equal(result, null);
});

test("txStore: list() returns entries newest first", () => {
  const txStore = createStore();
  const now = Date.now();
  txStore.add({ hash: "1".repeat(64), label: "First", createdAt: now - 3000 });
  txStore.add({ hash: "2".repeat(64), label: "Second", createdAt: now - 2000 });
  txStore.add({ hash: "3".repeat(64), label: "Third", createdAt: now - 1000 });
  const list = txStore.list();
  assert.equal(list.length, 3);
  assert.equal(list[0].label, "Third");
  assert.equal(list[1].label, "Second");
  assert.equal(list[2].label, "First");
});

test("txStore: get() retrieves a single entry by hash", () => {
  const txStore = createStore();
  txStore.add({ hash: "f".repeat(64), label: "Test" });
  const entry = txStore.get("f".repeat(64));
  assert.ok(entry);
  assert.equal(entry.label, "Test");
});

test("txStore: get() returns null for missing hash", () => {
  const txStore = createStore();
  const entry = txStore.get("missing".repeat(64));
  assert.equal(entry, null);
});

test("txStore: remove() deletes an entry", () => {
  const txStore = createStore();
  txStore.add({ hash: "g".repeat(64), label: "Test" });
  txStore.remove("g".repeat(64));
  assert.equal(txStore.list().length, 0);
});

test("txStore: clear() removes all entries", () => {
  const txStore = createStore();
  txStore.add({ hash: "h".repeat(64), label: "Test 1" });
  txStore.add({ hash: "i".repeat(64), label: "Test 2" });
  txStore.clear();
  assert.equal(txStore.list().length, 0);
});

test("txStore: getPendingCount() returns count of PENDING entries", () => {
  const txStore = createStore();
  txStore.add({ hash: "j".repeat(64), label: "Pending 1" });
  txStore.add({ hash: "k".repeat(64), label: "Pending 2" });
  txStore.update("j".repeat(64), { status: STATUS.SUCCESS });
  assert.equal(txStore.getPendingCount(), 1);
});

test("txStore: getPending() returns only PENDING entries", () => {
  const txStore = createStore();
  txStore.add({ hash: "l".repeat(64), label: "Pending" });
  txStore.add({ hash: "m".repeat(64), label: "Success" });
  txStore.update("m".repeat(64), { status: STATUS.SUCCESS });
  const pending = txStore.getPending();
  assert.equal(pending.length, 1);
  assert.equal(pending[0].label, "Pending");
});

// ── Pruning Tests ─────────────────────────────────────────────────────────────

test("txStore: prunes to MAX_ENTRIES (25) on add", () => {
  const txStore = createStore();
  const baseTime = Date.now();
  for (let i = 0; i < 30; i++) {
    txStore.add({ hash: i.toString(16).padStart(64, "0"), label: `Tx ${i}`, createdAt: baseTime + i });
  }
  assert.equal(txStore.list().length, 25);
  // Should keep the newest 25
  assert.equal(txStore.list()[0].label, "Tx 29");
  assert.equal(txStore.list()[24].label, "Tx 5");
});

test("txStore: prunes entries older than 7 days", () => {
  const txStore = createStore();
  const baseTime = Date.now();
  const eightDaysAgo = baseTime - 8 * 24 * 60 * 60 * 1000;
  const oneDayAgo = baseTime - 1 * 24 * 60 * 60 * 1000;

  txStore.add({ hash: "a".repeat(64), label: "Old", createdAt: eightDaysAgo });
  txStore.add({ hash: "b".repeat(64), label: "New", createdAt: oneDayAgo });

  // Trigger prune by adding another
  txStore.add({ hash: "c".repeat(64), label: "Trigger" });

  const list = txStore.list();
  assert.equal(list.length, 2);
  assert.ok(!list.find((e) => e.label === "Old"));
  assert.ok(list.find((e) => e.label === "New"));
});

test("txStore: prune combines both count and age limits", () => {
  const txStore = createStore();
  const baseTime = Date.now();
  // Add 20 old entries (6 days ago - pass age filter) + 10 new entries = 30 total
  // Age filter keeps all, count limit prunes to 25 (keeps 10 new + 15 newest old)
  for (let i = 0; i < 20; i++) {
    txStore.add({
      hash: `old${i}`.padStart(64, "0"),
      label: `Old ${i}`,
      createdAt: baseTime - 6 * 24 * 60 * 60 * 1000,
    });
  }
  for (let i = 0; i < 10; i++) {
    txStore.add({
      hash: `new${i}`.padStart(64, "0"),
      label: `New ${i}`,
      createdAt: baseTime - i * 1000,
    });
  }
  const list = txStore.list();
  assert.equal(list.length, 25);
  // All 10 new should be there
  const newCount = list.filter((e) => e.label.startsWith("New")).length;
  assert.equal(newCount, 10);
  // 15 oldest old entries should be pruned
  const oldCount = list.filter((e) => e.label.startsWith("Old")).length;
  assert.equal(oldCount, 15);
});

// ── Corrupt Storage Recovery ──────────────────────────────────────────────────

test("txStore: corrupt JSON returns empty store but allows new writes", () => {
  const storage = createCorruptStorage();
  const txStore = createTxStore(storage);
  const list = txStore.list();
  assert.equal(list.length, 0);
  // Should be able to add after corrupt read (setItem works on this mock)
  txStore.add({ hash: "a".repeat(64), label: "Test" });
  assert.equal(txStore.list().length, 1);
});

test("txStore: wrong schema version returns empty store", () => {
  const storage = createMockStorage();
  storage.setItem("liquifact-txs", JSON.stringify({ version: 999, entries: [] }));
  const txStore = createTxStore(storage);
  assert.equal(txStore.list().length, 0);
});

test("txStore: non-array entries returns empty store", () => {
  const storage = createMockStorage();
  storage.setItem("liquifact-txs", JSON.stringify({ version: 1, entries: "not an array" }));
  const txStore = createTxStore(storage);
  assert.equal(txStore.list().length, 0);
});

test("txStore: invalid entries are filtered out", () => {
  const storage = createMockStorage();
  storage.setItem(
    "liquifact-txs",
    JSON.stringify({
      version: 1,
      entries: [
        { hash: "a".repeat(64), label: "Valid", createdAt: Date.now(), status: "PENDING" },
        { hash: "short", label: "Invalid hash", createdAt: Date.now(), status: "PENDING" },
        { label: "Missing hash", createdAt: Date.now(), status: "PENDING" },
        "not an object",
      ],
    })
  );
  const txStore = createTxStore(storage);
  const list = txStore.list();
  assert.equal(list.length, 1);
  assert.equal(list[0].label, "Valid");
});

// ── Storage Unavailable Falls Back to Memory ──────────────────────────────────

test("txStore: failing storage uses in-memory fallback", () => {
  const storage = createFailingStorage();
  const txStore = createTxStore(storage);

  // Should not throw
  const entry = txStore.add({ hash: "a".repeat(64), label: "Test" });
  assert.equal(entry.label, "Test");

  const list = txStore.list();
  assert.equal(list.length, 1);

  txStore.update("a".repeat(64), { status: STATUS.SUCCESS });
  assert.equal(txStore.get("a".repeat(64)).status, STATUS.SUCCESS);
});

test("txStore: memory fallback persists across operations", () => {
  const storage = createFailingStorage();
  const txStore = createTxStore(storage);

  txStore.add({ hash: "a".repeat(64), label: "Test 1" });
  txStore.add({ hash: "b".repeat(64), label: "Test 2" });
  assert.equal(txStore.list().length, 2);
});

// ── STATUS Constants ──────────────────────────────────────────────────────────

test("txStore: STATUS object has expected values", () => {
  assert.equal(STATUS.PENDING, "PENDING");
  assert.equal(STATUS.SUCCESS, "SUCCESS");
  assert.equal(STATUS.FAILED, "FAILED");
  assert.equal(STATUS.UNKNOWN, "UNKNOWN");
});