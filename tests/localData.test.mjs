import test from "node:test";
import assert from "node:assert/strict";
import { STORAGE_KEYS, clearLocalData, describeLocalData } from "../lib/localData.js";
import { createNotificationStore } from "../lib/notifications/store.js";
import { createInvoiceMonitor } from "../lib/notifications/monitor.js";

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

test("reports known stored key counts and UTF-16 byte estimates without returning values", () => {
  const storage = memoryStorage({ [STORAGE_KEYS[0]]: "dark", [STORAGE_KEYS[1]]: "é", unrelated: "private" });
  const result = describeLocalData(storage);
  assert.equal(result.count, 2);
  assert.equal(result.bytes, 2 * (STORAGE_KEYS[0].length + 4 + STORAGE_KEYS[1].length + 1));
  assert.equal(result.available, true);
  assert.equal(result.entries.length, STORAGE_KEYS.length);
  assert.equal(JSON.stringify(result).includes("private"), false);
});

test("empty string is a stored entry; empty storage is reported accurately", () => {
  const storage = memoryStorage();
  assert.equal(describeLocalData(storage).count, 0);
  storage.setItem(STORAGE_KEYS[0], "");
  assert.equal(describeLocalData(storage).count, 1);
  assert.equal(describeLocalData(storage).bytes, STORAGE_KEYS[0].length * 2);
});

test("session draft inspection is restricted to known requested keys", () => {
  const storage = memoryStorage({ "liquifact-submit-draft": "draft", "unrelated-session": "keep" });
  const summary = describeLocalData(storage, ["liquifact-submit-draft", "unrelated-session"]);
  assert.equal(summary.count, 1);
  assert.deepEqual(summary.entries.map((entry) => entry.key), ["liquifact-submit-draft"]);
});

test("default clear removes all known keys while preserving other app, wallet and arbitrary LiquiFact-prefixed keys", () => {
  const storage = memoryStorage(Object.fromEntries([...STORAGE_KEYS, "other-app", "wallet-secret", "liquifact-unknown"].map((key) => [key, "fixture"])));
  const result = clearLocalData(storage);
  assert.equal(result.success, true);
  assert.deepEqual(result.removed, STORAGE_KEYS);
  assert.deepEqual([...storage.values.keys()], ["other-app", "wallet-secret", "liquifact-unknown"]);
  assert.equal(describeLocalData(storage).count, 0);
});

test("explicit clear keys are deduplicated and filtered against the closed vocabulary", () => {
  const storage = memoryStorage({ [STORAGE_KEYS[0]]: "dark", [STORAGE_KEYS[1]]: "{}", other: "keep" });
  assert.deepEqual(clearLocalData(storage, [STORAGE_KEYS[0], STORAGE_KEYS[0], "other", null]).removed, [STORAGE_KEYS[0]]);
  assert.equal(storage.getItem(STORAGE_KEYS[1]), "{}");
  assert.equal(storage.getItem("other"), "keep");
  assert.deepEqual(clearLocalData(storage, "other").removed, []);
});

test("throwing reads and storage accessors never escape or expose values", () => {
  for (const storage of [null, undefined, {}, { getItem() { throw new Error("private-error"); } },
    Object.defineProperty({}, "getItem", { get() { throw new Error("blocked"); } })]) {
    const result = describeLocalData(storage);
    assert.equal(result.available, false);
    assert.equal(result.count, 0);
    assert.equal(result.bytes, 0);
    assert.equal(JSON.stringify(result).includes("private-error"), false);
  }
});

test("clear continues after an individual failure and reports partial success accurately", () => {
  const storage = memoryStorage(Object.fromEntries(STORAGE_KEYS.map((key) => [key, "fixture"])));
  const remove = storage.removeItem;
  storage.removeItem = (key) => { if (key === STORAGE_KEYS[0]) throw new Error("blocked"); remove(key); };
  const result = clearLocalData(storage);
  assert.equal(result.success, false);
  assert.deepEqual(result.failed, [STORAGE_KEYS[0]]);
  assert.deepEqual(result.removed, STORAGE_KEYS.slice(1));
  assert.equal(describeLocalData(storage).count, 1);
  for (const unavailable of [null, {}, { removeItem() { throw new Error("blocked"); } }]) {
    assert.deepEqual(clearLocalData(unavailable).failed, STORAGE_KEYS);
  }
});

test("notification memory rehydrates empty after persisted data is cleared", () => {
  const storage = memoryStorage();
  const store = createNotificationStore({ storage });
  store.follow("synthetic-invoice");
  store.addEvent({ id: "synthetic-invoice", to: "funded" });
  clearLocalData(storage);
  store.reload();
  assert.equal(store.getFollowed().size, 0);
  assert.equal(store.unreadCount(), 0);
  assert.deepEqual(store.getSnapshot(), {});
});

test("in-flight invoice polling cannot recreate data or restart timers after settings clears it", async (t) => {
  t.mock.timers.enable({ toFake: ["setTimeout", "clearTimeout"] });
  const storage = memoryStorage();
  const store = createNotificationStore({ storage });
  store.follow("synthetic-invoice");
  let finish;
  let calls = 0;
  const monitor = createInvoiceMonitor({
    store,
    document: { visibilityState: "visible" },
    random: () => 0.5,
    listInvoices: () => {
      calls += 1;
      return new Promise((resolve) => { finish = resolve; });
    },
  });
  monitor.start();
  const pending = monitor.poll();
  clearLocalData(storage);
  store.reload();
  finish({ data: [{ id: "synthetic-invoice", status: "funded" }] });
  await pending;
  assert.equal(storage.getItem("liquifact.notifications.v1"), null);
  assert.deepEqual(store.getSnapshot(), {});
  t.mock.timers.tick(600000);
  await Promise.resolve();
  assert.equal(calls, 1);
  assert.equal(storage.getItem("liquifact.notifications.v1"), null);
  monitor.stop();
  t.mock.timers.reset();
});
