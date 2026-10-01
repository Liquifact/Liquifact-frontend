/**
 * @jest-environment jsdom
 *
 * @file lib/concurrency/tabLock.test.js
 *
 * Unit tests for the cross-tab exclusive lock primitive.
 */

import { supportsWebLocks, fundLockName, withExclusiveTabLock } from "./tabLock";

function installWebLocks(impl) {
  const locks = { request: jest.fn(impl) };
  Object.defineProperty(globalThis.navigator, "locks", {
    value: locks,
    configurable: true,
  });
  return locks;
}

afterEach(() => {
  delete globalThis.navigator.locks;
});

describe("supportsWebLocks", () => {
  it("is false when navigator.locks is missing", () => {
    expect(supportsWebLocks()).toBe(false);
  });

  it("is true when navigator.locks.request is a function", () => {
    installWebLocks(() => Promise.resolve());
    expect(supportsWebLocks()).toBe(true);
  });
});

describe("fundLockName", () => {
  it("namespaces the lock by invoice", () => {
    expect(fundLockName("inv-1")).toBe("liquifact-fund-lock-inv-1");
    expect(fundLockName("inv-1")).not.toBe(fundLockName("inv-2"));
  });
});

describe("withExclusiveTabLock (fallback, no Web Locks)", () => {
  it("runs fn and reports the lock as acquired", async () => {
    const fn = jest.fn().mockResolvedValue("value");
    const outcome = await withExclusiveTabLock("inv-1", fn);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(outcome).toEqual({ acquired: true, value: "value" });
  });

  it("propagates errors from fn", async () => {
    const fn = jest.fn().mockRejectedValue(new Error("boom"));
    await expect(withExclusiveTabLock("inv-1", fn)).rejects.toThrow("boom");
  });
});

describe("withExclusiveTabLock (Web Locks available)", () => {
  it("requests an exclusive, non-blocking lock for the invoice", async () => {
    const locks = installWebLocks((name, _opts, cb) => Promise.resolve(cb({ name })));

    const outcome = await withExclusiveTabLock("inv-9", async () => 42);

    expect(outcome).toEqual({ acquired: true, value: 42 });
    expect(locks.request).toHaveBeenCalledWith(
      "liquifact-fund-lock-inv-9",
      { mode: "exclusive", ifAvailable: true },
      expect.any(Function)
    );
  });

  it("does not call fn when another tab already holds the lock", async () => {
    installWebLocks((_name, _opts, cb) => Promise.resolve(cb(null)));
    const fn = jest.fn();

    const outcome = await withExclusiveTabLock("inv-9", fn);

    expect(fn).not.toHaveBeenCalled();
    expect(outcome).toEqual({ acquired: false, value: undefined });
  });

  it("releases the lock when fn throws", async () => {
    installWebLocks((_name, _opts, cb) => Promise.resolve(cb({})));
    await expect(
      withExclusiveTabLock("inv-9", async () => {
        throw new Error("rejected");
      })
    ).rejects.toThrow("rejected");
  });
});
