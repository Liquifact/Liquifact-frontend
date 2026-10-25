import { test } from "node:test";
import assert from "node:assert/strict";
import { createNotificationStore } from "../lib/notifications/store.js";

function fakeStorage() {
  const data = new Map();
  return {
    getItem(k) { return data.get(k) || null; },
    setItem(k, v) { data.set(k, String(v)); },
    removeItem(k) { data.delete(k); },
  };
}

test("starts with empty state and zero unread", () => {
  const store = createNotificationStore({ storage: fakeStorage() });
  assert.deepEqual(store.getEvents(), []);
  assert.equal(store.unreadCount(), 0);
  assert.deepEqual(store.getFollowed(), new Set());
});

test("adds an event and marks it unread", () => {
  const store = createNotificationStore({ storage: fakeStorage() });
  store.addEvent({ id: "INV_0002", type: "funded", from: "open", to: "funded", at: "t1" });
  assert.equal(store.unreadCount(), 1);
  const events = store.getEvents();
  assert.equal(events.length, 1);
  assert.equal(events[0].id, "INV_0002");
  assert.equal(events[0].read, false);
});

test("markAllRead sets unreadCount to zero", () => {
  const store = createNotificationStore({ storage: fakeStorage() });
  store.addEvent({ id: "A", type: "funded", from: "open", to: "funded", at: "t1" });
  store.addEvent({ id: "B", type: "settled", from: "funded", to: "settled", at: "t2" });
  assert.equal(store.unreadCount(), 2);
  store.markAllRead();
  assert.equal(store.unreadCount(), 0);
  assert.ok(store.getEvents().every((e) => e.read));
});

test("caps events at 50, newest first", () => {
  const store = createNotificationStore({ storage: fakeStorage(), maxEvents: 3 });
  store.addEvent({ id: "A", type: "funded", from: "open", to: "funded", at: "t1" });
  store.addEvent({ id: "B", type: "funded", from: "open", to: "funded", at: "t2" });
  store.addEvent({ id: "C", type: "funded", from: "open", to: "funded", at: "t3" });
  store.addEvent({ id: "D", type: "funded", from: "open", to: "funded", at: "t4" });
  const events = store.getEvents();
  assert.equal(events.length, 3);
  assert.equal(events[0].id, "D");
  assert.equal(events[1].id, "C");
  assert.equal(events[2].id, "B");
});

test("follow/unfollow tracked in store", () => {
  const store = createNotificationStore({ storage: fakeStorage() });
  assert.equal(store.isFollowing("INV_0002"), false);
  store.follow("INV_0002");
  assert.equal(store.isFollowing("INV_0002"), true);
  store.follow("INV_0002"); // idempotent
  assert.deepEqual([...store.getFollowed()], ["INV_0002"]);
  store.unfollow("INV_0002");
  assert.equal(store.isFollowing("INV_0002"), false);
});

test("snapshot get/set and replace", () => {
  const store = createNotificationStore({ storage: fakeStorage() });
  store.setSnapshot({ id: "INV_0002", status: "open", fundedAmount: 0, amount: 25000 });
  assert.equal(store.getSnapshot()["INV_0002"].status, "open");
  store.replaceSnapshot([{ id: "INV_0002", status: "funded", fundedAmount: 25000, amount: 25000 }]);
  assert.equal(store.getSnapshot()["INV_0002"].status, "funded");
});

test("persistence round-trips through storage", () => {
  const storage = fakeStorage();
  const store = createNotificationStore({ storage });
  store.follow("INV_0001");
  store.addEvent({ id: "INV_0001", type: "funded", from: "open", to: "funded", at: "t1" });

  // New store instance reading the same storage should restore state.
  const restored = createNotificationStore({ storage });
  assert.equal(restored.isFollowing("INV_0001"), true);
  assert.equal(restored.unreadCount(), 1);
  assert.equal(restored.getEvents()[0].id, "INV_0001");
});

test("corruption-safe: invalid JSON returns clean state", () => {
  const storage = fakeStorage();
  storage.setItem("liquifact.notifications.v1", "{not valid json");
  const store = createNotificationStore({ storage });
  assert.equal(store.unreadCount(), 0);
  assert.deepEqual(store.getEvents(), []);
});

test("corruption-safe: wrong version returns clean state", () => {
  const storage = fakeStorage();
  storage.setItem("liquifact.notifications.v1", JSON.stringify({ version: 99, snapshot: {}, events: [], followedIds: [] }));
  const store = createNotificationStore({ storage });
  assert.equal(store.unreadCount(), 0);
});

test("corruption-safe: malformed events array returns clean state", () => {
  const storage = fakeStorage();
  storage.setItem("liquifact.notifications.v1", JSON.stringify({ version: 1, snapshot: {}, events: "nope", followedIds: [] }));
  const store = createNotificationStore({ storage });
  assert.equal(store.unreadCount(), 0);
});
