import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { createOutbox, isNetworkError, OUTBOX_KEY } from "../lib/outbox.js";
import { createInvoice } from "../lib/api.js";

function createMemoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem(k) {
      return map.has(k) ? map.get(k) : null;
    },
    setItem(k, v) {
      map.set(k, String(v));
    },
    removeItem(k) {
      map.delete(k);
    },
  };
}

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("enqueue adds an idempotencyKey uuid, list returns FIFO order, remove deletes by key", () => {
  const storage = createMemoryStorage();
  const outbox = createOutbox(storage);

  const a = outbox.enqueue({ sme: "Acme", amount: 1000 });
  const b = outbox.enqueue({ sme: "Beta", amount: 2000 });

  assert.match(a.idempotencyKey, /^[0-9a-f-]{36}$/i);
  assert.notEqual(a.idempotencyKey, b.idempotencyKey);
  assert.deepEqual(
    outbox.list().map((i) => i.payload.sme),
    ["Acme", "Beta"]
  );

  outbox.remove(a.idempotencyKey);
  assert.deepEqual(
    outbox.list().map((i) => i.payload.sme),
    ["Beta"]
  );
});

test("flush delivers items in order and removes them from storage", async () => {
  const storage = createMemoryStorage();
  const outbox = createOutbox(storage);
  outbox.enqueue({ sme: "One" });
  outbox.enqueue({ sme: "Two" });

  const sent = [];
  const res = await outbox.flush(async (item) => {
    sent.push(item.payload.sme);
    return { data: { id: `INV-${sent.length}` } };
  });

  assert.deepEqual(sent, ["One", "Two"]);
  assert.equal(res.delivered.length, 2);
  assert.equal(res.dropped.length, 0);
  assert.equal(res.remaining.length, 0);
  assert.equal(outbox.list().length, 0);
});

test("flush stops on network errors and preserves idempotencyKey across retries", async () => {
  const storage = createMemoryStorage();
  const outbox = createOutbox(storage);
  const first = outbox.enqueue({ sme: "First" });
  const second = outbox.enqueue({ sme: "Second" });

  const seenKeys = [];
  const res1 = await outbox.flush(async (item) => {
    seenKeys.push(item.idempotencyKey);
    throw new TypeError("Failed to fetch");
  });

  assert.equal(res1.delivered.length, 0);
  assert.equal(res1.dropped.length, 0);
  assert.equal(res1.remaining.length, 2);
  assert.deepEqual(seenKeys, [first.idempotencyKey]);

  const retryKeys = [];
  const res2 = await outbox.flush(async (item) => {
    retryKeys.push(item.idempotencyKey);
    return { data: { id: "INV-OK" } };
  });

  assert.equal(res2.delivered.length, 2);
  assert.equal(res2.remaining.length, 0);
  assert.deepEqual(retryKeys, [first.idempotencyKey, second.idempotencyKey]);
});

test("flush drops 4xx errors and continues flushing remaining items", async () => {
  const storage = createMemoryStorage();
  const outbox = createOutbox(storage);
  outbox.enqueue({ sme: "Bad" });
  outbox.enqueue({ sme: "Good" });

  const res = await outbox.flush(async (item) => {
    if (item.payload.sme === "Bad") {
      const err = new Error("Validation failed");
      err.status = 422;
      throw err;
    }
    return { data: { id: "INV-GOOD" } };
  });

  assert.equal(res.dropped.length, 1);
  assert.equal(res.dropped[0].item.payload.sme, "Bad");
  assert.equal(res.dropped[0].error.status, 422);
  assert.equal(res.delivered.length, 1);
  assert.equal(res.delivered[0].item.payload.sme, "Good");
  assert.equal(res.remaining.length, 0);
});

test("outbox caps queue size to maxSize", () => {
  const storage = createMemoryStorage();
  const outbox = createOutbox(storage, { maxSize: 3 });

  for (let i = 1; i <= 5; i += 1) {
    outbox.enqueue({ sme: `SME-${i}` });
  }

  assert.deepEqual(
    outbox.list().map((i) => i.payload.sme),
    ["SME-3", "SME-4", "SME-5"]
  );
});

test("corrupt or throwing storage never throws", async () => {
  const badJson = createMemoryStorage({ [OUTBOX_KEY]: "{not-valid-json" });
  const ob1 = createOutbox(badJson);
  assert.deepEqual(ob1.list(), []);
  assert.doesNotThrow(() => ob1.enqueue({ sme: "Recovered" }));
  assert.equal(ob1.list().length, 1);

  const nonArray = createMemoryStorage({ [OUTBOX_KEY]: JSON.stringify({ oops: true }) });
  assert.deepEqual(createOutbox(nonArray).list(), []);

  const throwingStorage = {
    getItem() {
      throw new Error("SecurityError");
    },
    setItem() {
      throw new Error("QuotaExceededError");
    },
  };
  const ob2 = createOutbox(throwingStorage);
  assert.deepEqual(ob2.list(), []);
  assert.doesNotThrow(() => ob2.enqueue({ sme: "Safe" }));
  assert.doesNotThrow(() => ob2.remove("missing"));
  const flushed = await ob2.flush(async () => ({}));
  assert.deepEqual(flushed, { delivered: [], dropped: [], remaining: [] });

  const obNull = createOutbox(null);
  assert.deepEqual(obNull.list(), []);
});

test("createInvoice sends Idempotency-Key header when provided", async () => {
  const captured = [];
  globalThis.fetch = async (_url, options) => {
    captured.push(options.headers);
    return new Response(JSON.stringify({ data: { id: "INV-1" } }), { status: 201 });
  };

  await createInvoice({ sme: "Acme" }, { idempotencyKey: "key-123" });
  await createInvoice({ sme: "Acme" });

  assert.equal(captured[0]["Idempotency-Key"], "key-123");
  assert.equal(captured[1]["Idempotency-Key"], undefined);
});

test("isNetworkError distinguishes network errors from HTTP status errors", () => {
  assert.equal(isNetworkError(new TypeError("Failed to fetch")), true);
  const http400 = Object.assign(new Error("Bad Request"), { status: 400 });
  const http500 = Object.assign(new Error("Server Error"), { status: 500 });
  assert.equal(isNetworkError(http400), false);
  assert.equal(isNetworkError(http500), false);
});
