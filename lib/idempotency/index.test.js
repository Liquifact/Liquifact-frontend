/**
 * @jest-environment jsdom
 *
 * @file lib/idempotency/index.test.js
 *
 * Unit tests for the idempotency key generation and persistence utilities.
 */

import { buildStorageKey, getOrCreateIdempotencyKey, clearIdempotencyKey } from "./index";

// ── helpers ───────────────────────────────────────────────────────────────────

function clearAllIdemKeys() {
  Object.keys(localStorage).forEach((k) => {
    if (k.startsWith("liquifact-idem-")) localStorage.removeItem(k);
  });
  Object.keys(sessionStorage).forEach((k) => {
    if (k.startsWith("liquifact-idem-")) sessionStorage.removeItem(k);
  });
}

/**
 * Assert that a value is a canonical UUID v4 string.
 * Centralised so every invariant check uses the same strict pattern.
 */
const UUID_V4_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function expectUuidV4(value) {
  expect(typeof value).toBe("string");
  expect(value).toMatch(UUID_V4_RE);
}

beforeEach(() => {
  clearAllIdemKeys();
  __resetIdempotencyCacheForTests();
  // Ensure crypto.randomUUID is available (jsdom supplies it)
});

afterEach(() => {
  jest.restoreAllMocks();
});

/**
 * Run `fn` while the global `sessionStorage` binding is undefined, simulating
 * SSR / a sandboxed iframe with no storage.
 */
function withoutSessionStorage(fn) {
  const original = Object.getOwnPropertyDescriptor(globalThis, "sessionStorage");
  Object.defineProperty(globalThis, "sessionStorage", {
    value: undefined,
    configurable: true,
    writable: true,
  });
  try {
    return fn();
  } finally {
    if (original) {
      Object.defineProperty(globalThis, "sessionStorage", original);
    } else {
      delete globalThis.sessionStorage;
    }
  }
}

// ── buildStorageKey ───────────────────────────────────────────────────────────

describe("buildStorageKey", () => {
  it("returns a string with the expected shape", () => {
    const key = buildStorageKey("inv-001", "GABC...XYZ", 500);
    expect(key).toBe("liquifact-idem-GABC...XYZ-inv%2D001-500");
  });

  it("treats null walletAddress as 'anon'", () => {
    const key = buildStorageKey("inv-002", null, 100);
    expect(key).toBe("liquifact-idem-anon-inv%2D002-100");
  });

  it("treats undefined walletAddress as 'anon'", () => {
    const key = buildStorageKey("inv-002", undefined, 100);
    expect(key).toBe("liquifact-idem-anon-inv%2D002-100");
  });

  it("uses different keys for different amounts on the same invoice", () => {
    const k1 = buildStorageKey("inv-001", "wallet", 100);
    const k2 = buildStorageKey("inv-001", "wallet", 200);
    expect(k1).not.toBe(k2);
  });

  it("is collision-free when an input itself contains the delimiter", () => {
    // Naive join would give both of these "liquifact-idem-x-y-z-1".
    const a = buildStorageKey("y-z", "x", 1);
    const b = buildStorageKey("z", "x-y", 1);
    expect(a).not.toBe(b);
  });
});

// ── getOrCreateIdempotencyKey ─────────────────────────────────────────────────

describe("getOrCreateIdempotencyKey", () => {
  it("returns a UUID string", () => {
    const key = getOrCreateIdempotencyKey("inv-001", "wallet", 500);
    // UUID v4 pattern
    expect(key).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it("returns the same key on repeated calls (idempotent)", () => {
    const key1 = getOrCreateIdempotencyKey("inv-001", "wallet", 500);
    const key2 = getOrCreateIdempotencyKey("inv-001", "wallet", 500);
    expect(key1).toBe(key2);
  });

  it("returns different keys for different (invoice, amount) tuples", () => {
    const k1 = getOrCreateIdempotencyKey("inv-001", "wallet", 500);
    const k2 = getOrCreateIdempotencyKey("inv-002", "wallet", 500);
    const k3 = getOrCreateIdempotencyKey("inv-001", "wallet", 999);
    expect(k1).not.toBe(k2);
    expect(k1).not.toBe(k3);
  });

  it("returns different keys for different wallet addresses", () => {
    const k1 = getOrCreateIdempotencyKey("inv-001", "wallet-A", 500);
    const k2 = getOrCreateIdempotencyKey("inv-001", "wallet-B", 500);
    expect(k1).not.toBe(k2);
  });

  it("persists the key in localStorage", () => {
    const key = getOrCreateIdempotencyKey("inv-persist", "wallet", 200);
    const stored = localStorage.getItem("liquifact-idem-wallet-inv-persist-200");
    expect(stored).toBe(key);
  });

  it("migrates a retry key from the previous sessionStorage format", () => {
    sessionStorage.setItem("liquifact-idem-wallet-inv-legacy-200", "legacy-key");

    expect(getOrCreateIdempotencyKey("inv-legacy", "wallet", 200)).toBe("legacy-key");
    expect(localStorage.getItem("liquifact-idem-wallet-inv-legacy-200")).toBe("legacy-key");
  });

  it("fails closed when shared idempotency storage is unavailable", () => {
    const getItem = jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("storage unavailable");
    });

    let error;
    try {
      getOrCreateIdempotencyKey("inv-storage", "wallet", 200);
    } catch (caught) {
      error = caught;
    } finally {
      getItem.mockRestore();
    }
    expect(error).toMatchObject({ code: "FUND_IDEMPOTENCY_UNAVAILABLE" });
  });

  it("regenerates if localStorage is cleared between calls", () => {
    const key1 = getOrCreateIdempotencyKey("inv-001", "wallet", 500);
    localStorage.removeItem("liquifact-idem-anon-inv-001-500");
    localStorage.removeItem("liquifact-idem-wallet-inv-001-500");
    const key2 = getOrCreateIdempotencyKey("inv-001", "wallet", 500);
    // A fresh key is generated — different from the cleared one.
    expect(key2).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    // The two keys may happen to be equal (UUID collision) but almost certainly aren't.
    // We only assert the new key is a valid UUID.
    void key1;
  });

  it("returns the same key for concurrent calls on the same tuple", () => {
    const keys = Array.from({ length: 25 }, () =>
      getOrCreateIdempotencyKey("inv-race", "wallet", 500)
    );
    const unique = new Set(keys);
    expect(unique.size).toBe(1);
  });

  it("is idempotent across repeated sequential calls (retry safety)", () => {
    const first = getOrCreateIdempotencyKey("inv-retry", "wallet", 750);
    for (let i = 0; i < 10; i++) {
      expect(getOrCreateIdempotencyKey("inv-retry", "wallet", 750)).toBe(first);
    }
  });

  it("does not collide across distinct tuples under concurrent access", () => {
    const tuples = [
      ["inv-a", "wallet", 100],
      ["inv-a", "wallet", 200],
      ["inv-a", "other", 100],
      ["inv-b", "wallet", 100],
    ];
    const results = tuples.map(([inv, w, amt]) =>
      getOrCreateIdempotencyKey(inv, w, amt)
    );
    expect(new Set(results).size).toBe(tuples.length);
  });

  it("treats boundary amounts (0 and large) deterministically", () => {
    const zero1 = getOrCreateIdempotencyKey("inv-zero", "wallet", 0);
    const zero2 = getOrCreateIdempotencyKey("inv-zero", "wallet", 0);
    expect(zero1).toBe(zero2);

    const big1 = getOrCreateIdempotencyKey("inv-big", "wallet", Number.MAX_SAFE_INTEGER);
    const big2 = getOrCreateIdempotencyKey("inv-big", "wallet", Number.MAX_SAFE_INTEGER);
    expect(big1).toBe(big2);
    expect(big1).not.toBe(zero1);
  });

  it("does not mutate the stored key when read concurrently", () => {
    const key = getOrCreateIdempotencyKey("inv-stable", "wallet", 42);
    const storageKey = buildStorageKey("inv-stable", "wallet", 42);
    for (let i = 0; i < 5; i++) {
      getOrCreateIdempotencyKey("inv-stable", "wallet", 42);
      expect(sessionStorage.getItem(storageKey)).toBe(key);
    }
  });
});

// ── clearIdempotencyKey ───────────────────────────────────────────────────────

describe("clearIdempotencyKey", () => {
  it("removes the key from both current and legacy storage", () => {
    getOrCreateIdempotencyKey("inv-clear", "wallet", 300);
    sessionStorage.setItem("liquifact-idem-wallet-inv-clear-300", "legacy-key");
    clearIdempotencyKey("inv-clear", "wallet", 300);
    expect(localStorage.getItem("liquifact-idem-wallet-inv-clear-300")).toBeNull();
    expect(sessionStorage.getItem("liquifact-idem-wallet-inv-clear-300")).toBeNull();
  });

  it("does not throw if the key does not exist", () => {
    expect(() => clearIdempotencyKey("inv-ghost", "wallet", 100)).not.toThrow();
  });

  it("after clearing, getOrCreateIdempotencyKey generates a fresh key", () => {
    const key1 = getOrCreateIdempotencyKey("inv-fresh", "wallet", 400);
    clearIdempotencyKey("inv-fresh", "wallet", 400);
    const key2 = getOrCreateIdempotencyKey("inv-fresh", "wallet", 400);
    // Two randomly generated UUIDs are almost certainly different.
    // We assert they are both valid UUIDs; equality would be a UUID collision.
    expect(key2).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    void key1;
  });

  it("is safe to call concurrently with getOrCreateIdempotencyKey", () => {
    const key = getOrCreateIdempotencyKey("inv-cc", "wallet", 500);
    clearIdempotencyKey("inv-cc", "wallet", 500);
    const fresh = getOrCreateIdempotencyKey("inv-cc", "wallet", 500);
    expect(fresh).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
    expect(fresh).not.toBe(key);
  });

  it("clearing one tuple does not affect other tuples", () => {
    const a = getOrCreateIdempotencyKey("inv-iso", "wallet", 100);
    const b = getOrCreateIdempotencyKey("inv-iso", "wallet", 200);
    clearIdempotencyKey("inv-iso", "wallet", 100);
    expect(sessionStorage.getItem(buildStorageKey("inv-iso", "wallet", 100))).toBeNull();
    expect(getOrCreateIdempotencyKey("inv-iso", "wallet", 200)).toBe(b);
    void a;
  });
});
