import { test } from "node:test";
import assert from "node:assert/strict";
import { createInvoiceMonitor } from "../lib/notifications/monitor.js";

function makeStore() {
  const events = [];
  const followed = new Set();
  const snapshot = {};
  return {
    getSnapshot() { return { ...snapshot }; },
    setSnapshot(inv) { if (inv && inv.id) snapshot[inv.id] = inv; },
    addEvent(e) { events.push(e); },
    replaceSnapshot(invoices) { for (const inv of invoices || []) if (inv) snapshot[inv.id] = inv; },
    getFollowed() { return new Set(followed); },
    follow(id) { followed.add(id); },
    unfollow(id) { followed.delete(id); },
    _events() { return events; },
    _followed() { return followed; },
  };
}

function makeDocument(visibilityState = "visible") {
  let state = visibilityState;
  const listeners = new Map();
  return {
    get visibilityState() { return state; },
    set visibilityState(v) {
      state = v;
      const fn = listeners.get("visibilitychange");
      if (fn) fn({ type: "visibilitychange" });
    },
    addEventListener(type, fn) { listeners.set(type, fn); },
    removeEventListener(type) { listeners.delete(type); },
    dispatchVisibilityChange(v) { this.visibilityState = v; },
  };
}

async function flushPromises() { await Promise.resolve(); await Promise.resolve(); }

test("does not poll when nothing is followed", async (t) => {
  t.mock.timers.enable({ toFake: ["setTimeout", "clearTimeout"] });
  const calls = [];
  const listInvoices = async () => { calls.push(1); return { data: [] }; };
  const store = makeStore();
  const document = makeDocument();

  const monitor = createInvoiceMonitor({ listInvoices, store, document });
  monitor.start();
  await flushPromises();
  t.mock.timers.tick(60000);
  await flushPromises();
  assert.equal(calls.length, 0);
  t.mock.timers.reset();
});

test("polls every interval while visible and followed", async (t) => {
  t.mock.timers.enable({ toFake: ["setTimeout", "clearTimeout"] });
  const calls = [];
  const listInvoices = async () => { calls.push(1); return { data: [] }; };
  const store = makeStore();
  store.follow("INV_0001");
  const document = makeDocument("visible");

  const monitor = createInvoiceMonitor({ listInvoices, store, document, intervalMs: 60000, random: () => 0.5 });
  monitor.start();
  await flushPromises();
  assert.equal(calls.length, 0, "start() schedules but does not poll immediately");

  t.mock.timers.tick(60000);
  await flushPromises();
  assert.equal(calls.length, 1);

  t.mock.timers.tick(60000);
  await flushPromises();
  assert.equal(calls.length, 2);
  t.mock.timers.reset();
});

test("pauses polling when tab becomes hidden", async (t) => {
  t.mock.timers.enable({ toFake: ["setTimeout", "clearTimeout"] });
  const calls = [];
  const listInvoices = async () => { calls.push(1); return { data: [] }; };
  const store = makeStore();
  store.follow("INV_0001");
  const document = makeDocument("visible");

  const monitor = createInvoiceMonitor({ listInvoices, store, document, intervalMs: 60000, random: () => 0.5 });
  monitor.start();
  await flushPromises();
  t.mock.timers.tick(60000);
  await flushPromises();
  assert.equal(calls.length, 1);

  document.visibilityState = "hidden";
  monitor.onVisibilityChange(); // hidden -> pause
  await flushPromises();
  t.mock.timers.tick(120000);
  await flushPromises();
  assert.equal(calls.length, 1, "no more polls while hidden");

  document.visibilityState = "visible";
  monitor.onVisibilityChange(); // visible -> poll once + resume
  await flushPromises();
  assert.equal(calls.length, 2, "polls once when becoming visible");
  t.mock.timers.reset();
});

test("refreshes once on focus", async (t) => {
  t.mock.timers.enable({ toFake: ["setTimeout", "clearTimeout"] });
  const calls = [];
  const listInvoices = async () => { calls.push(1); return { data: [] }; };
  const store = makeStore();
  store.follow("INV_0001");
  const document = makeDocument("visible");

  const monitor = createInvoiceMonitor({ listInvoices, store, document, intervalMs: 60000, random: () => 0.5 });
  monitor.start();
  await flushPromises();
  t.mock.timers.tick(60000);
  await flushPromises();
  assert.equal(calls.length, 1);

  monitor.onFocus();
  await flushPromises();
  assert.equal(calls.length, 2);
  t.mock.timers.reset();
});

test("diff events are dispatched through onEvent", async (t) => {
  t.mock.timers.enable({ toFake: ["setTimeout", "clearTimeout"] });
  const dispatched = [];
  const store = makeStore();
  store.follow("INV_0001");
  store.setSnapshot({ id: "INV_0001", status: "open", fundedAmount: 0, amount: 100 });
  const listInvoices = async () => ({ data: [{ id: "INV_0001", status: "funded", fundedAmount: 100, amount: 100 }] });
  const document = makeDocument("visible");

  const monitor = createInvoiceMonitor({ listInvoices, store, document, intervalMs: 60000, random: () => 0.5 });
  monitor.setOnEvent((e) => dispatched.push(e));
  monitor.start();
  await flushPromises();
  t.mock.timers.tick(60000);
  await flushPromises();
  assert.equal(dispatched.length, 1);
  assert.equal(dispatched[0].type, "funded");
  t.mock.timers.reset();
});

test("backs off after failures, caps at five minutes, and resets on success", async (t) => {
  t.mock.timers.enable({ toFake: ["setTimeout", "clearTimeout"] });
  const store = makeStore();
  store.follow("INV_0001");
  const document = makeDocument("visible");
  let shouldFail = true;
  const monitor = createInvoiceMonitor({
    listInvoices: async () => {
      if (shouldFail) throw new Error("offline");
      return { data: [] };
    },
    store,
    document,
    random: () => 0.5,
  });

  monitor.start();
  assert.deepEqual(monitor.getStatus(), { failures: 0, nextDelayMs: 60000 });
  t.mock.timers.tick(60000);
  await flushPromises();
  assert.deepEqual(monitor.getStatus(), { failures: 1, nextDelayMs: 120000 });

  t.mock.timers.tick(120000);
  await flushPromises();
  assert.deepEqual(monitor.getStatus(), { failures: 2, nextDelayMs: 240000 });

  t.mock.timers.tick(240000);
  await flushPromises();
  assert.deepEqual(monitor.getStatus(), { failures: 3, nextDelayMs: 300000 });

  t.mock.timers.tick(300000);
  await flushPromises();
  assert.deepEqual(monitor.getStatus(), { failures: 4, nextDelayMs: 300000 });

  shouldFail = false;
  t.mock.timers.tick(300000);
  await flushPromises();
  assert.deepEqual(monitor.getStatus(), { failures: 0, nextDelayMs: 60000 });
  monitor.stop();
  t.mock.timers.reset();
});

test("applies injectable jitter to the next delay", async (t) => {
  t.mock.timers.enable({ toFake: ["setTimeout", "clearTimeout"] });
  const store = makeStore();
  store.follow("INV_0001");
  const monitor = createInvoiceMonitor({
    listInvoices: async () => { throw new Error("offline"); },
    store,
    document: makeDocument("visible"),
    random: () => 0,
  });

  monitor.start();
  assert.equal(monitor.getStatus().nextDelayMs, 48000);
  t.mock.timers.tick(48000);
  await flushPromises();
  assert.equal(monitor.getStatus().nextDelayMs, 96000);
  monitor.stop();
  t.mock.timers.reset();
});

test("treats an offline fallback response as a failed poll", async (t) => {
  t.mock.timers.enable({ toFake: ["setTimeout", "clearTimeout"] });
  const store = makeStore();
  store.follow("INV_0001");
  const monitor = createInvoiceMonitor({
    listInvoices: async () => ({ data: [], offline: true }),
    store,
    document: makeDocument("visible"),
    random: () => 0.5,
  });

  monitor.start();
  t.mock.timers.tick(60000);
  await flushPromises();
  assert.deepEqual(monitor.getStatus(), { failures: 1, nextDelayMs: 120000 });
  assert.deepEqual(store.getSnapshot(), {});
  monitor.stop();
  t.mock.timers.reset();
});

// ---------------------------------------------------------------------------
// Multi-source and merge tests
// ---------------------------------------------------------------------------

test("chain source events are merged with API events and dispatched", async (t) => {
  t.mock.timers.enable({ toFake: ["setTimeout", "clearTimeout"] });
  const dispatched = [];
  const store = makeStore();
  store.follow("INV_0001");
  store.follow("INV_0002");
  store.setSnapshot({ id: "INV_0001", status: "open", fundedAmount: 0, amount: 100 });
  store.setSnapshot({ id: "INV_0002", status: "open", fundedAmount: 0, amount: 200 });

  // API: INV_0001 moves to funded
  const listInvoices = async () => ({
    data: [
      { id: "INV_0001", status: "funded", fundedAmount: 100, amount: 100 },
      { id: "INV_0002", status: "open",   fundedAmount: 50,  amount: 200 },
    ],
  });

  // Chain source: INV_0002 progress event (not seen by API diff yet)
  const chainSource = {
    poll: async () => [
      { id: "INV_0002", type: "progress", from: "on-chain", to: "progress", at: new Date().toISOString(), chainEventId: "chain-e1" },
    ],
  };

  const monitor = createInvoiceMonitor({
    listInvoices,
    store,
    sources: [chainSource],
    document: makeDocument("visible"),
    intervalMs: 60000,
    random: () => 0.5,
  });
  monitor.setOnEvent((e) => dispatched.push(e));
  monitor.start();
  await flushPromises();
  t.mock.timers.tick(60000);
  await flushPromises();

  assert.equal(dispatched.length, 2);
  const types = dispatched.map((e) => e.type).sort();
  assert.deepEqual(types, ["funded", "progress"]);
  t.mock.timers.reset();
});

test("chain source event suppresses the matching API diff event (dedupe by id+type)", async (t) => {
  t.mock.timers.enable({ toFake: ["setTimeout", "clearTimeout"] });
  const dispatched = [];
  const store = makeStore();
  store.follow("INV_0001");
  store.setSnapshot({ id: "INV_0001", status: "open", fundedAmount: 0, amount: 100 });

  // Both API and chain source emit a 'funded' event for INV_0001.
  const listInvoices = async () => ({
    data: [{ id: "INV_0001", status: "funded", fundedAmount: 100, amount: 100 }],
  });

  const chainSource = {
    poll: async () => [
      { id: "INV_0001", type: "funded", from: "on-chain", to: "funded", at: new Date().toISOString(), chainEventId: "chain-funded-1" },
    ],
  };

  const monitor = createInvoiceMonitor({
    listInvoices,
    store,
    sources: [chainSource],
    document: makeDocument("visible"),
    intervalMs: 60000,
    random: () => 0.5,
  });
  monitor.setOnEvent((e) => dispatched.push(e));
  monitor.start();
  await flushPromises();
  t.mock.timers.tick(60000);
  await flushPromises();

  // Only one notification — the chain event wins.
  assert.equal(dispatched.length, 1);
  assert.equal(dispatched[0].chainEventId, "chain-funded-1");
  t.mock.timers.reset();
});

test("chain source failure does not fail the whole poll (API events still delivered)", async (t) => {
  t.mock.timers.enable({ toFake: ["setTimeout", "clearTimeout"] });
  const dispatched = [];
  const store = makeStore();
  store.follow("INV_0001");
  store.setSnapshot({ id: "INV_0001", status: "open", fundedAmount: 0, amount: 100 });

  const listInvoices = async () => ({
    data: [{ id: "INV_0001", status: "funded", fundedAmount: 100, amount: 100 }],
  });

  // Chain source throws — should not propagate.
  const failingChainSource = {
    poll: async () => { throw new Error("RPC timeout"); },
  };

  const monitor = createInvoiceMonitor({
    listInvoices,
    store,
    sources: [failingChainSource],
    document: makeDocument("visible"),
    intervalMs: 60000,
    random: () => 0.5,
  });
  monitor.setOnEvent((e) => dispatched.push(e));
  monitor.start();
  await flushPromises();
  t.mock.timers.tick(60000);
  await flushPromises();

  // API event still arrives, monitor failure counter stays at 0.
  assert.equal(dispatched.length, 1);
  assert.equal(dispatched[0].type, "funded");
  assert.deepEqual(monitor.getStatus(), { failures: 0, nextDelayMs: 60000 });
  t.mock.timers.reset();
});

test("monitor without sources behaves identically to the original API-only behaviour", async (t) => {
  t.mock.timers.enable({ toFake: ["setTimeout", "clearTimeout"] });
  const dispatched = [];
  const store = makeStore();
  store.follow("INV_0001");
  store.setSnapshot({ id: "INV_0001", status: "open", fundedAmount: 0, amount: 100 });

  const listInvoices = async () => ({
    data: [{ id: "INV_0001", status: "funded", fundedAmount: 100, amount: 100 }],
  });

  // No sources option — backward-compatible default.
  const monitor = createInvoiceMonitor({
    listInvoices,
    store,
    document: makeDocument("visible"),
    intervalMs: 60000,
    random: () => 0.5,
  });
  monitor.setOnEvent((e) => dispatched.push(e));
  monitor.start();
  await flushPromises();
  t.mock.timers.tick(60000);
  await flushPromises();

  assert.equal(dispatched.length, 1);
  assert.equal(dispatched[0].type, "funded");
  t.mock.timers.reset();
});
