import { test } from "node:test";
import assert from "node:assert/strict";
import { nativeToScVal } from "@stellar/stellar-sdk";
import {
  EscrowActivityError,
  createActivityPoller,
  decodeContractEvent,
  eventMatchesInvoice,
  fetchEscrowActivity,
  latestLedger,
} from "../lib/escrow-activity.js";

const b64 = (v, opts) => nativeToScVal(v, opts).toXDR("base64");

function rawEvent(id, invoiceId) {
  return {
    id,
    ledger: 123,
    txHash: "a".repeat(64),
    ledgerClosedAt: "2026-10-01T00:00:00Z",
    topic: [b64("fund", { type: "symbol" })],
    value: b64({ invoice_id: invoiceId, amount: 5n }, { type: { invoice_id: ["symbol", "string"], amount: ["symbol", "i128"] } }),
  };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function event(id) {
  return { id, name: "fund", ledger: 1, txHash: "a".repeat(64), timestamp: "2026-10-01T00:00:00Z", fields: { invoice_id: "INV_0001" } };
}

function makeScheduler() {
  let nextId = 1;
  const timers = new Map();
  return {
    setTimer(fn, ms) {
      const id = nextId++;
      timers.set(id, { fn, ms });
      return id;
    },
    clearTimer(id) {
      timers.delete(id);
    },
    size() {
      return timers.size;
    },
    delays() {
      return [...timers.values()].map((timer) => timer.ms);
    },
  };
}

function makeDocument(initial = "visible") {
  let visibilityState = initial;
  const listeners = new Set();
  return {
    get visibilityState() {
      return visibilityState;
    },
    setVisibility(next) {
      visibilityState = next;
      for (const listener of listeners) listener();
    },
    addEventListener(type, listener) {
      if (type === "visibilitychange") listeners.add(listener);
    },
    removeEventListener(type, listener) {
      if (type === "visibilitychange") listeners.delete(listener);
    },
    listenerCount() {
      return listeners.size;
    },
  };
}

function createPoller(overrides = {}) {
  const scheduler = makeScheduler();
  const doc = makeDocument();
  const delivered = [];
  const errors = [];
  const statuses = [];
  const poller = createActivityPoller({
    intervalMs: 1000,
    setTimer: scheduler.setTimer,
    clearTimer: scheduler.clearTimer,
    doc,
    now: () => 1700000000000,
    onEvents: (events) => delivered.push(...events.map((item) => item.id)),
    onError: (error, meta) => errors.push({ error, meta }),
    onStatus: (status) => statuses.push(status),
    ...overrides,
  });
  return { poller, scheduler, doc, delivered, errors, statuses };
}

test("decodeContractEvent names the event and exposes its fields", () => {
  const ev = decodeContractEvent(rawEvent("e1", "INV_0001"));
  assert.equal(ev.name, "fund");
  assert.equal(ev.ledger, 123);
  assert.equal(String(ev.fields.invoice_id), "INV_0001");
  assert.ok(eventMatchesInvoice(ev, "INV_0001"));
  assert.ok(!eventMatchesInvoice(ev, "INV_0002"));
});

test("fetchEscrowActivity posts getEvents and paginates by cursor", async () => {
  const bodies = [];
  const fetchImpl = async (_url, init) => {
    bodies.push(JSON.parse(init.body));
    return { ok: true, json: async () => ({ result: { events: [rawEvent("e1", "INV_0001")], cursor: "c1" } }) };
  };
  const page = await fetchEscrowActivity({ rpcUrl: "https://rpc.test", contractId: "CABC", startLedger: 10, fetchImpl });
  assert.equal(bodies[0].method, "getEvents");
  assert.equal(bodies[0].params.startLedger, 10);
  assert.deepEqual(bodies[0].params.filters[0].contractIds, ["CABC"]);
  assert.equal(page.cursor, "c1");
  assert.equal(page.events.length, 1);
  await fetchEscrowActivity({ rpcUrl: "https://rpc.test", contractId: "CABC", cursor: "c1", fetchImpl });
  assert.equal(bodies[1].params.pagination.cursor, "c1");
  assert.equal(bodies[1].params.startLedger, undefined);
});

test("fetchEscrowActivity surfaces structured RPC errors", async () => {
  await assert.rejects(
    fetchEscrowActivity({ rpcUrl: "x", contractId: "C", fetchImpl: async () => ({ ok: false, status: 503 }) }),
    (error) => error instanceof EscrowActivityError && error.code === "http" && error.status === 503 && /503/.test(error.message),
  );
  await assert.rejects(
    fetchEscrowActivity({ rpcUrl: "x", contractId: "C", fetchImpl: async () => ({ ok: true, json: async () => ({ error: { message: "bad" } }) }) }),
    (error) => error instanceof EscrowActivityError && error.code === "rpc" && error.rpcMessage === "bad" && /bad/.test(error.message),
  );
  await assert.rejects(
    fetchEscrowActivity({ rpcUrl: "x", contractId: "C", fetchImpl: async () => { throw new Error("offline"); } }),
    (error) => error instanceof EscrowActivityError && error.code === "network",
  );
});

test("latestLedger returns the RPC sequence", async () => {
  const bodies = [];
  const fetchImpl = async (_url, init) => {
    bodies.push(JSON.parse(init.body));
    return { ok: true, json: async () => ({ result: { sequence: 4242 } }) };
  };
  assert.equal(await latestLedger("https://rpc.test", { fetchImpl }), 4242);
  assert.equal(bodies[0].method, "getLatestLedger");
  assert.deepEqual(bodies[0].params, {});
});

test("latestLedger reports readable structured failures", async () => {
  await assert.rejects(
    latestLedger("x", { fetchImpl: async () => ({ ok: false, status: 503 }) }),
    (error) => error instanceof EscrowActivityError && error.code === "http" && error.status === 503,
  );
  await assert.rejects(
    latestLedger("x", { fetchImpl: async () => ({ ok: true, json: async () => ({ error: { message: "boom" } }) }) }),
    (error) => error instanceof EscrowActivityError && error.code === "rpc" && /boom/.test(error.message),
  );
  await assert.rejects(
    latestLedger("x", { fetchImpl: async () => { throw new Error("offline"); } }),
    (error) => error instanceof EscrowActivityError && error.code === "network",
  );
  await assert.rejects(
    latestLedger("x", { fetchImpl: async () => ({ ok: true, json: async () => ({ result: { sequence: 0 } }) }) }),
    (error) => error instanceof EscrowActivityError && error.code === "invalidLedger",
  );
});

test("poller starts with a null cursor, advances it and delivers events", async () => {
  const pages = [
    { events: [event("e1")], cursor: "c1" },
    { events: [event("e1"), event("e2")], cursor: "c2" },
  ];
  const calls = [];
  const { poller, delivered, scheduler } = createPoller({
    fetchPage: async ({ cursor }) => {
      calls.push(cursor);
      return pages.shift();
    },
  });
  poller.start();
  await flush();
  assert.deepEqual(calls, [null]);
  assert.equal(poller.getCursor(), "c1");
  assert.equal(scheduler.size(), 1);

  await poller.pollNow();
  assert.deepEqual(calls, [null, "c1"]);
  assert.equal(poller.getCursor(), "c2");
  assert.deepEqual(delivered, ["e1", "e2"]);
  poller.stop();
});

test("poller deduplicates by stable event id", async () => {
  const pages = [
    { events: [event("e1"), event("e2")], cursor: "c1" },
    { events: [event("e2"), event("e1")], cursor: "c1" },
    { events: [event("e3")], cursor: "c2" },
  ];
  const { poller, delivered } = createPoller({ fetchPage: async () => pages.shift() });
  poller.start();
  await flush();
  await poller.pollNow();
  await poller.pollNow();
  assert.deepEqual(delivered, ["e1", "e2", "e3"]);
  assert.equal(poller.getCursor(), "c2");
  poller.stop();
});

test("poller handles empty pages and repeated cursors safely", async () => {
  const pages = [
    { events: [], cursor: "c1" },
    { events: [], cursor: "c1" },
    { events: [], cursor: null },
  ];
  const { poller, delivered, statuses } = createPoller({ fetchPage: async () => pages.shift() });
  poller.start();
  await flush();
  await poller.pollNow();
  await poller.pollNow();
  assert.deepEqual(delivered, []);
  assert.equal(poller.getCursor(), "c1");
  assert.equal(statuses.length, 3);
  assert.equal(statuses[0].fresh, 0);
  poller.stop();
});

test("poller uses exponential backoff with jitter and a maximum cap", async () => {
  const { poller, scheduler, errors } = createPoller({
    fetchPage: async () => { throw new Error("rpc down"); },
    baseBackoffMs: 1000,
    maxBackoffMs: 4000,
    random: () => 1,
  });
  poller.start();
  await flush();
  assert.deepEqual(scheduler.delays(), [1000]);
  await poller.pollNow();
  assert.deepEqual(scheduler.delays(), [2000]);
  await poller.pollNow();
  assert.deepEqual(scheduler.delays(), [4000]);
  await poller.pollNow();
  assert.deepEqual(scheduler.delays(), [4000]);
  assert.equal(poller.getFailureCount(), 4);
  assert.deepEqual(errors.map((item) => item.meta.failures), [1, 2, 3, 4]);
  assert.equal(errors[0].meta.retryInMs, 1000);
  poller.stop();
});

test("poller jitter stays within the backoff window", async () => {
  const low = createPoller({ fetchPage: async () => { throw new Error("x"); }, random: () => 0 });
  low.poller.start();
  await flush();
  assert.deepEqual(low.scheduler.delays(), [500]);
  low.poller.stop();

  const high = createPoller({ fetchPage: async () => { throw new Error("x"); }, random: () => 1 });
  high.poller.start();
  await flush();
  assert.deepEqual(high.scheduler.delays(), [1000]);
  high.poller.stop();
});

test("poller does not fetch while the document is hidden and resumes when visible", async () => {
  let calls = 0;
  const doc = makeDocument("hidden");
  const { poller, scheduler } = createPoller({
    doc,
    fetchPage: async () => {
      calls += 1;
      return { events: [], cursor: `c${calls}` };
    },
  });
  poller.start();
  await flush();
  assert.equal(calls, 0);
  assert.equal(poller.isPaused(), true);
  assert.equal(scheduler.size(), 0);

  doc.setVisibility("visible");
  await flush();
  assert.equal(calls, 1);
  assert.equal(poller.isPaused(), false);
  assert.equal(poller.getCursor(), "c1");
  poller.stop();
});

test("poller pauses on hidden and clears its timer, then resumes", async () => {
  let calls = 0;
  const { poller, doc, scheduler } = createPoller({
    fetchPage: async () => {
      calls += 1;
      return { events: [], cursor: `c${calls}` };
    },
  });
  poller.start();
  await flush();
  assert.equal(calls, 1);
  assert.equal(scheduler.size(), 1);

  doc.setVisibility("hidden");
  assert.equal(poller.isPaused(), true);
  assert.equal(scheduler.size(), 0);
  assert.equal(await poller.pollNow(), false);
  assert.equal(calls, 1);

  doc.setVisibility("visible");
  await flush();
  assert.equal(calls, 2);
  poller.stop();
});

test("poller prevents overlapping requests", async () => {
  let calls = 0;
  let resolveFetch;
  const { poller } = createPoller({
    fetchPage: () => {
      calls += 1;
      return new Promise((resolve) => { resolveFetch = resolve; });
    },
  });
  poller.start();
  await flush();
  assert.equal(calls, 1);
  assert.equal(await poller.pollNow(), false);
  assert.equal(calls, 1);
  resolveFetch({ events: [], cursor: "c1" });
  await flush();
  assert.equal(calls, 1);
  assert.equal(poller.getCursor(), "c1");
  poller.stop();
});

test("poller cleans up timers and visibility listeners when stopped", async () => {
  let calls = 0;
  const { poller, doc, scheduler } = createPoller({
    fetchPage: async () => {
      calls += 1;
      return { events: [], cursor: "c1" };
    },
  });
  poller.start();
  await flush();
  assert.equal(calls, 1);
  assert.equal(scheduler.size(), 1);
  assert.equal(doc.listenerCount(), 1);

  poller.stop();
  assert.equal(scheduler.size(), 0);
  assert.equal(doc.listenerCount(), 0);
  assert.equal(await poller.pollNow(), false);
  doc.setVisibility("visible");
  await flush();
  assert.equal(calls, 1);
});

test("poller records the last successful update time", async () => {
  const { poller } = createPoller({ fetchPage: async () => ({ events: [], cursor: "c1" }), now: () => 12345 });
  assert.equal(poller.getLastUpdated(), null);
  poller.start();
  await flush();
  assert.equal(poller.getLastUpdated(), 12345);
  poller.stop();
});
