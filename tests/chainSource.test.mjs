/**
 * tests/chainSource.test.mjs
 *
 * Unit tests for lib/notifications/chainSource.js.
 *
 * Run with:
 *   node --test tests/chainSource.test.mjs
 *
 * All Stellar SDK dependencies are avoided — events are built from plain
 * objects to keep these tests fast and dependency-free.
 */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createChainSource } from "../lib/notifications/chainSource.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal decoded event (as returned by decodeContractEvent). */
function makeEvent(id, name, invoiceId, overrides = {}) {
  return {
    id,
    name,
    ledger: 100,
    txHash: "a".repeat(64),
    timestamp: "2026-10-01T00:00:00Z",
    fields: { invoice_id: invoiceId, amount: 5000 },
    ...overrides,
  };
}

/** Minimal in-memory store that only implements the cursor API. */
function makeStore(initial = {}) {
  const cursors = { ...initial };
  const written = [];
  return {
    getChainCursors() { return { ...cursors }; },
    setChainCursor(contractId, cursor) {
      cursors[contractId] = cursor;
      written.push({ contractId, cursor });
    },
    _cursors() { return cursors; },
    _written() { return written; },
  };
}

/** escrowFor stub that maps invoiceId -> contractId from a plain dict. */
function makeEscrowFor(map) {
  return ({ id }) => {
    const contractId = map[id];
    return contractId ? { contractId, source: "registry" } : null;
  };
}

const CONTRACT_A = "C" + "A".repeat(55);
const CONTRACT_B = "C" + "B".repeat(55);
const RPC_URL = "https://rpc.test";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("lib/notifications/chainSource", () => {
  let store;
  let escrowFor;

  beforeEach(() => {
    store = makeStore();
    escrowFor = makeEscrowFor({ INV_0001: CONTRACT_A, INV_0002: CONTRACT_B });
  });

  // ── Basic event translation ───────────────────────────────────────────────

  it("translates a 'fund' event into a progress notification", async () => {
    const fetchEscrowActivity = async () => ({
      events: [makeEvent("e1", "fund", "INV_0001")],
      cursor: "c1",
    });

    const source = createChainSource({ fetchEscrowActivity, escrowFor, store, rpcUrl: RPC_URL });
    const events = await source.poll(new Set(["INV_0001"]));

    assert.equal(events.length, 1);
    assert.equal(events[0].id, "INV_0001");
    assert.equal(events[0].type, "progress");
    assert.equal(events[0].chainEventId, "e1");
  });

  it("translates a 'funded' event into a funded notification", async () => {
    const fetchEscrowActivity = async () => ({
      events: [makeEvent("e2", "funded", "INV_0001")],
      cursor: "c2",
    });

    const source = createChainSource({ fetchEscrowActivity, escrowFor, store, rpcUrl: RPC_URL });
    const events = await source.poll(new Set(["INV_0001"]));

    assert.equal(events.length, 1);
    assert.equal(events[0].type, "funded");
  });

  it("translates 'settle' and 'settled' events into settled notifications", async () => {
    for (const name of ["settle", "settled"]) {
      const fetchEscrowActivity = async () => ({
        events: [makeEvent("ex", name, "INV_0001")],
        cursor: "cx",
      });
      const src = createChainSource({ fetchEscrowActivity, escrowFor, store: makeStore(), rpcUrl: RPC_URL });
      const events = await src.poll(new Set(["INV_0001"]));
      assert.equal(events[0].type, "settled", `name='${name}'`);
    }
  });

  it("translates 'refund' and 'refunded' events into refunded notifications", async () => {
    for (const name of ["refund", "refunded"]) {
      const fetchEscrowActivity = async () => ({
        events: [makeEvent("ex", name, "INV_0001")],
        cursor: "cx",
      });
      const src = createChainSource({ fetchEscrowActivity, escrowFor, store: makeStore(), rpcUrl: RPC_URL });
      const events = await src.poll(new Set(["INV_0001"]));
      assert.equal(events[0].type, "refunded", `name='${name}'`);
    }
  });

  it("ignores events with unknown names", async () => {
    const fetchEscrowActivity = async () => ({
      events: [makeEvent("e3", "deposit_reserve", "INV_0001")],
      cursor: "c3",
    });

    const source = createChainSource({ fetchEscrowActivity, escrowFor, store, rpcUrl: RPC_URL });
    const events = await source.poll(new Set(["INV_0001"]));

    assert.equal(events.length, 0);
  });

  it("ignores events whose invoice_id does not match any followed invoice", async () => {
    const fetchEscrowActivity = async () => ({
      events: [makeEvent("e4", "fund", "INV_9999")],
      cursor: "c4",
    });

    const source = createChainSource({ fetchEscrowActivity, escrowFor, store, rpcUrl: RPC_URL });
    const events = await source.poll(new Set(["INV_0001"]));

    assert.equal(events.length, 0);
  });

  // ── invoiceId field fallback ──────────────────────────────────────────────

  it("matches invoice id from alternative field names (invoiceId, id)", async () => {
    const fetchEscrowActivity = async () => ({
      events: [
        { id: "e5", name: "fund", ledger: 1, txHash: "a".repeat(64), timestamp: "", fields: { invoiceId: "INV_0001" } },
        { id: "e6", name: "fund", ledger: 2, txHash: "a".repeat(64), timestamp: "", fields: { id: "INV_0001" } },
      ],
      cursor: "c5",
    });

    const source = createChainSource({ fetchEscrowActivity, escrowFor, store, rpcUrl: RPC_URL });
    const events = await source.poll(new Set(["INV_0001"]));

    assert.equal(events.length, 2);
  });

  it("falls back to scanning all field values when no known field key matches", async () => {
    const fetchEscrowActivity = async () => ({
      events: [
        { id: "e7", name: "fund", ledger: 1, txHash: "a".repeat(64), timestamp: "", fields: { custom_key: "INV_0001" } },
      ],
      cursor: "c6",
    });

    const source = createChainSource({ fetchEscrowActivity, escrowFor, store, rpcUrl: RPC_URL });
    const events = await source.poll(new Set(["INV_0001"]));

    assert.equal(events.length, 1);
  });

  // ── Cursor persistence ────────────────────────────────────────────────────

  it("persists the returned cursor in the store", async () => {
    const fetchEscrowActivity = async () => ({
      events: [makeEvent("e8", "fund", "INV_0001")],
      cursor: "cursor-new",
    });

    const source = createChainSource({ fetchEscrowActivity, escrowFor, store, rpcUrl: RPC_URL });
    await source.poll(new Set(["INV_0001"]));

    assert.equal(store._cursors()[CONTRACT_A], "cursor-new");
  });

  it("sends the stored cursor on subsequent polls (not startLedger)", async () => {
    const calls = [];
    const fetchEscrowActivity = async (params) => {
      calls.push(params);
      return { events: [], cursor: "c-next" };
    };

    const storeWithCursor = makeStore({ [CONTRACT_A]: "existing-cursor" });
    const source = createChainSource({ fetchEscrowActivity, escrowFor, store: storeWithCursor, rpcUrl: RPC_URL, startLedger: 42 });
    await source.poll(new Set(["INV_0001"]));

    assert.equal(calls[0].cursor, "existing-cursor");
    assert.equal(calls[0].startLedger, undefined);
  });

  it("sends startLedger when no cursor is stored for the contract", async () => {
    const calls = [];
    const fetchEscrowActivity = async (params) => {
      calls.push(params);
      return { events: [], cursor: null };
    };

    const source = createChainSource({ fetchEscrowActivity, escrowFor, store, rpcUrl: RPC_URL, startLedger: 500 });
    await source.poll(new Set(["INV_0001"]));

    assert.equal(calls[0].startLedger, 500);
    assert.equal(calls[0].cursor, undefined);
  });

  it("does not update the cursor when the page returns null", async () => {
    const fetchEscrowActivity = async () => ({ events: [], cursor: null });

    const source = createChainSource({ fetchEscrowActivity, escrowFor, store, rpcUrl: RPC_URL });
    await source.poll(new Set(["INV_0001"]));

    assert.equal(store._written().length, 0);
  });

  it("does not update the cursor when it is unchanged", async () => {
    const existing = "same-cursor";
    const storeWithCursor = makeStore({ [CONTRACT_A]: existing });
    const fetchEscrowActivity = async () => ({ events: [], cursor: existing });

    const source = createChainSource({ fetchEscrowActivity, escrowFor, store: storeWithCursor, rpcUrl: RPC_URL });
    await source.poll(new Set(["INV_0001"]));

    assert.equal(storeWithCursor._written().length, 0);
  });

  it("avoids duplicate events when chainEventId is the same across polls", async () => {
    // The deduplication by chainEventId happens in the monitor's mergeEvents,
    // not inside chainSource itself — chainSource simply returns all events
    // from the page. This test confirms the chainEventId field is included.
    const fetchEscrowActivity = async () => ({
      events: [makeEvent("event-unique-id", "fund", "INV_0001")],
      cursor: "c9",
    });

    const source = createChainSource({ fetchEscrowActivity, escrowFor, store, rpcUrl: RPC_URL });
    const events = await source.poll(new Set(["INV_0001"]));

    assert.equal(events[0].chainEventId, "event-unique-id");
  });

  // ── Multi-contract ────────────────────────────────────────────────────────

  it("polls each unique contract once and returns events for all followed invoices", async () => {
    const calls = [];
    const fetchEscrowActivity = async (params) => {
      calls.push(params.contractId);
      const id = params.contractId === CONTRACT_A ? "INV_0001" : "INV_0002";
      return { events: [makeEvent(`e-${id}`, "fund", id)], cursor: "cx" };
    };

    const source = createChainSource({ fetchEscrowActivity, escrowFor, store, rpcUrl: RPC_URL });
    const events = await source.poll(new Set(["INV_0001", "INV_0002"]));

    assert.equal(calls.length, 2);
    assert.ok(calls.includes(CONTRACT_A));
    assert.ok(calls.includes(CONTRACT_B));
    assert.equal(events.length, 2);
  });

  // ── RPC failure fallback ──────────────────────────────────────────────────

  it("returns an empty array and does not throw when RPC fails", async () => {
    const fetchEscrowActivity = async () => { throw new Error("RPC timeout"); };

    const source = createChainSource({ fetchEscrowActivity, escrowFor, store, rpcUrl: RPC_URL });
    const events = await source.poll(new Set(["INV_0001"]));

    assert.equal(events.length, 0);
  });

  it("returns events for healthy contracts even when one contract's RPC call fails", async () => {
    const fetchEscrowActivity = async (params) => {
      if (params.contractId === CONTRACT_A) throw new Error("timeout");
      return { events: [makeEvent("e-b", "fund", "INV_0002")], cursor: "c-b" };
    };

    const source = createChainSource({ fetchEscrowActivity, escrowFor, store, rpcUrl: RPC_URL });
    const events = await source.poll(new Set(["INV_0001", "INV_0002"]));

    assert.equal(events.length, 1);
    assert.equal(events[0].id, "INV_0002");
  });

  // ── Edge cases ────────────────────────────────────────────────────────────

  it("returns an empty array when no followed invoices are provided", async () => {
    const calls = [];
    const fetchEscrowActivity = async () => { calls.push(1); return { events: [], cursor: null }; };

    const source = createChainSource({ fetchEscrowActivity, escrowFor, store, rpcUrl: RPC_URL });
    const events = await source.poll(new Set());

    assert.equal(events.length, 0);
    assert.equal(calls.length, 0);
  });

  it("skips followed invoices that have no known escrow contract", async () => {
    const calls = [];
    const fetchEscrowActivity = async () => { calls.push(1); return { events: [], cursor: null }; };
    const noRegistryEscrowFor = () => null;

    const source = createChainSource({ fetchEscrowActivity, escrowFor: noRegistryEscrowFor, store, rpcUrl: RPC_URL });
    const events = await source.poll(new Set(["INV_UNKNOWN"]));

    assert.equal(events.length, 0);
    assert.equal(calls.length, 0);
  });

  it("uses event.timestamp as the 'at' field when present", async () => {
    const ts = "2026-11-15T12:00:00Z";
    const fetchEscrowActivity = async () => ({
      events: [{ id: "e10", name: "fund", ledger: 1, txHash: "a".repeat(64), timestamp: ts, fields: { invoice_id: "INV_0001" } }],
      cursor: "c10",
    });

    const source = createChainSource({ fetchEscrowActivity, escrowFor, store, rpcUrl: RPC_URL });
    const events = await source.poll(new Set(["INV_0001"]));

    assert.equal(events[0].at, ts);
  });
});
