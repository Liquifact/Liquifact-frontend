/**
 * @file app/settings/lib.concurrency.test.js
 *
 * Comprehensive concurrency, racing, deduplication, timing boundary,
 * idempotent retry, input boundary, and fixture protection tests for
 * app/settings/lib.js.
 */

import {
  MOCK_SETTINGS,
  loadMockSettings,
  getCategoryList,
  getCategories,
  getSettingById,
  getInFlightLoadCount,
  clearInFlightLoads,
  logSettingsDiagnostic,
} from "./lib";

describe("app/settings/lib concurrency hardening", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    clearInFlightLoads();
    if (typeof window !== "undefined") {
      delete window.__TEST_MOCK_SETTINGS__;
    }
  });

  afterEach(() => {
    clearInFlightLoads();
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    if (typeof window !== "undefined") {
      delete window.__TEST_MOCK_SETTINGS__;
    }
    jest.restoreAllMocks();
  });

  // ── 1. Concurrent Execution, Coalescing & Deduplication ───────────────────

  describe("Request coalescing and duplicate work prevention", () => {
    it("coalesces multiple concurrent load calls into a single in-flight execution", async () => {
      const setTimeoutSpy = jest.spyOn(global, "setTimeout");

      // Launch 4 concurrent load requests with synthetic delay
      const p1 = loadMockSettings({ delay: 100 });
      const p2 = loadMockSettings({ delay: 100 });
      const p3 = loadMockSettings({ delay: 100 });
      const p4 = loadMockSettings({ delay: 100 });

      // In-flight count tracks all 4 callers
      expect(getInFlightLoadCount()).toBe(4);

      // Only one timer was scheduled for the coalesced execution
      expect(setTimeoutSpy).toHaveBeenCalledTimes(1);

      // Advance timers to trigger resolution
      jest.advanceTimersByTime(100);

      const [r1, r2, r3, r4] = await Promise.all([p1, p2, p3, p4]);

      expect(r1).toBe(MOCK_SETTINGS);
      expect(r2).toBe(MOCK_SETTINGS);
      expect(r3).toBe(MOCK_SETTINGS);
      expect(r4).toBe(MOCK_SETTINGS);

      // After settling, in-flight count drops to 0
      expect(getInFlightLoadCount()).toBe(0);
    });

    it("allows forceRefresh to bypass active in-flight coalescing", async () => {
      const p1 = loadMockSettings({ delay: 100 });
      expect(getInFlightLoadCount()).toBe(1);

      const p2 = loadMockSettings({ delay: 50, forceRefresh: true });
      // p2 ran standalone, so inFlightLoadCount for the coalesced batch remains 1
      expect(getInFlightLoadCount()).toBe(1);

      jest.advanceTimersByTime(50);
      const res2 = await p2;
      expect(res2).toBe(MOCK_SETTINGS);

      jest.advanceTimersByTime(50);
      const res1 = await p1;
      expect(res1).toBe(MOCK_SETTINGS);
      expect(getInFlightLoadCount()).toBe(0);
    });
  });

  // ── 2. Independent AbortSignal Isolation in Concurrent Execution ──────────

  describe("Independent AbortSignal isolation during races", () => {
    it("cancels only the aborted caller while allowing sibling callers to succeed", async () => {
      const controllerA = new AbortController();
      const controllerB = new AbortController();

      const pA = loadMockSettings({ signal: controllerA.signal, delay: 100 });
      const pB = loadMockSettings({ signal: controllerB.signal, delay: 100 });
      const pC = loadMockSettings({ delay: 100 }); // Unaborted caller

      expect(getInFlightLoadCount()).toBe(3);

      // Abort caller A mid-flight
      controllerA.abort();

      // Caller A receives empty array immediately
      const resA = await pA;
      expect(resA).toEqual([]);

      // In-flight count now reflects the remaining 2 callers
      expect(getInFlightLoadCount()).toBe(2);

      // Advance timers to finish load for B and C
      jest.advanceTimersByTime(100);

      const [resB, resC] = await Promise.all([pB, pC]);
      expect(resB).toBe(MOCK_SETTINGS);
      expect(resC).toBe(MOCK_SETTINGS);
      expect(getInFlightLoadCount()).toBe(0);
    });

    it("cancels underlying timer immediately when ALL concurrent callers abort", async () => {
      const clearTimeoutSpy = jest.spyOn(global, "clearTimeout");
      const controllerA = new AbortController();
      const controllerB = new AbortController();

      const pA = loadMockSettings({ signal: controllerA.signal, delay: 100 });
      const pB = loadMockSettings({ signal: controllerB.signal, delay: 100 });

      expect(getInFlightLoadCount()).toBe(2);

      controllerA.abort();
      expect(await pA).toEqual([]);
      expect(getInFlightLoadCount()).toBe(1);

      controllerB.abort();
      expect(await pB).toEqual([]);
      expect(getInFlightLoadCount()).toBe(0);

      // Underlying timer was cleared when the last caller aborted
      expect(clearTimeoutSpy).toHaveBeenCalled();
    });

    it("immediately resolves with empty array when signal is already aborted", async () => {
      const controller = new AbortController();
      controller.abort();

      const setTimeoutSpy = jest.spyOn(global, "setTimeout");
      const result = await loadMockSettings({ signal: controller.signal, delay: 100 });

      expect(result).toEqual([]);
      // Did not schedule any timer
      expect(setTimeoutSpy).not.toHaveBeenCalled();
      expect(getInFlightLoadCount()).toBe(0);
    });

    it("standalone load with forceRefresh handles mid-flight abort correctly", async () => {
      const controller = new AbortController();
      const promise = loadMockSettings({
        signal: controller.signal,
        delay: 100,
        forceRefresh: true,
      });

      controller.abort();
      const result = await promise;
      expect(result).toEqual([]);
    });

    it("standalone load with forceRefresh handles pre-aborted signal correctly", async () => {
      const controller = new AbortController();
      controller.abort();

      const result = await loadMockSettings({
        signal: controller.signal,
        delay: 100,
        forceRefresh: true,
      });

      expect(result).toEqual([]);
    });
  });

  // ── 3. Lifecycle & Memory Leak Prevention (Listener Cleanup) ──────────────

  describe("Memory leak prevention & event listener cleanup", () => {
    it("removes abort event listener from signal when load resolves normally", async () => {
      const controller = new AbortController();
      const removeListenerSpy = jest.spyOn(controller.signal, "removeEventListener");

      const promise = loadMockSettings({ signal: controller.signal, delay: 50 });
      jest.advanceTimersByTime(50);
      await promise;

      expect(removeListenerSpy).toHaveBeenCalledWith("abort", expect.any(Function));
    });

    it("removes abort event listener when load is aborted", async () => {
      const controller = new AbortController();
      const removeListenerSpy = jest.spyOn(controller.signal, "removeEventListener");

      const promise = loadMockSettings({ signal: controller.signal, delay: 100 });
      controller.abort();
      await promise;

      expect(removeListenerSpy).toHaveBeenCalledWith("abort", expect.any(Function));
    });
  });

  // ── 4. Idempotent Retries & Timing Boundaries ─────────────────────────────

  describe("Idempotent retries and timing boundaries", () => {
    it("allows immediate successful retry after a previously aborted request", async () => {
      const controller = new AbortController();
      const p1 = loadMockSettings({ signal: controller.signal, delay: 100 });
      controller.abort();
      const r1 = await p1;
      expect(r1).toEqual([]);

      // Retry immediately
      const p2 = loadMockSettings({ delay: 50 });
      jest.advanceTimersByTime(50);
      const r2 = await p2;
      expect(r2).toBe(MOCK_SETTINGS);
    });

    it("executes consecutive sequential loads deterministically", async () => {
      const p1 = loadMockSettings({ delay: 30 });
      jest.advanceTimersByTime(30);
      const r1 = await p1;
      expect(r1).toBe(MOCK_SETTINGS);

      const p2 = loadMockSettings({ delay: 30 });
      jest.advanceTimersByTime(30);
      const r2 = await p2;
      expect(r2).toBe(MOCK_SETTINGS);

      expect(r1).toBe(r2);
    });

    it("clearInFlightLoads cancels pending loads cleanly", async () => {
      const p1 = loadMockSettings({ delay: 100 });
      const p2 = loadMockSettings({ delay: 100 });
      expect(getInFlightLoadCount()).toBe(2);

      clearInFlightLoads();
      expect(getInFlightLoadCount()).toBe(0);

      const [r1, r2] = await Promise.all([p1, p2]);
      expect(r1).toEqual([]);
      expect(r2).toEqual([]);
    });
  });

  // ── 5. Input Boundaries & Defensive Normalization ─────────────────────────

  describe("Input boundary resilience", () => {
    it("handles null and undefined options without throwing", async () => {
      const pNull = loadMockSettings(null);
      const pUndef = loadMockSettings(undefined);

      jest.advanceTimersByTime(100);
      const [rNull, rUndef] = await Promise.all([pNull, pUndef]);

      expect(rNull).toBe(MOCK_SETTINGS);
      expect(rUndef).toBe(MOCK_SETTINGS);
    });

    it("handles non-object primitives as options", async () => {
      const pNum = loadMockSettings(12345);
      const pStr = loadMockSettings("invalid");
      const pBool = loadMockSettings(false);

      jest.advanceTimersByTime(100);
      const [rNum, rStr, rBool] = await Promise.all([pNum, pStr, pBool]);

      expect(rNum).toBe(MOCK_SETTINGS);
      expect(rStr).toBe(MOCK_SETTINGS);
      expect(rBool).toBe(MOCK_SETTINGS);
    });

    it("handles invalid or non-standard signal object gracefully", async () => {
      const p1 = loadMockSettings({ signal: "not-a-signal" });
      const p2 = loadMockSettings({ signal: { aborted: false } }); // no addEventListener

      jest.advanceTimersByTime(100);
      const [r1, r2] = await Promise.all([p1, p2]);

      expect(r1).toBe(MOCK_SETTINGS);
      expect(r2).toBe(MOCK_SETTINGS);
    });
  });

  // ── 6. Fixture Protection & Immutability ───────────────────────────────────

  describe("Fixture immutability and protection", () => {
    it("ensures MOCK_SETTINGS is frozen", () => {
      expect(Object.isFrozen(MOCK_SETTINGS)).toBe(true);
    });

    it("ensures every row in MOCK_SETTINGS is deeply frozen", () => {
      for (const row of MOCK_SETTINGS) {
        expect(Object.isFrozen(row)).toBe(true);
      }
    });

    it("prevents mutating row properties in loaded settings", async () => {
      const promise = loadMockSettings();
      jest.advanceTimersByTime(100);
      const settings = await promise;
      expect(() => {
        "use strict";
        settings[0].value = "compromised";
      }).toThrow(TypeError);
    });
  });

  // ── 7. getSettingById Validation ──────────────────────────────────────────

  describe("getSettingById validation & boundaries", () => {
    it("resolves valid setting by exact ID", () => {
      const setting = getSettingById("pref-001");
      expect(setting).toBeDefined();
      expect(setting.id).toBe("pref-001");
      expect(setting.label).toBe("Email notifications");
    });

    it("resolves setting with whitespace trimmed", () => {
      const setting = getSettingById("  pref-002  ");
      expect(setting).toBeDefined();
      expect(setting.id).toBe("pref-002");
    });

    it("returns undefined for non-existent IDs", () => {
      expect(getSettingById("pref-999")).toBeUndefined();
      expect(getSettingById("unknown")).toBeUndefined();
    });

    it("returns undefined for null, undefined, and non-string inputs", () => {
      expect(getSettingById(null)).toBeUndefined();
      expect(getSettingById(undefined)).toBeUndefined();
      expect(getSettingById(123)).toBeUndefined();
      expect(getSettingById({})).toBeUndefined();
      expect(getSettingById([])).toBeUndefined();
      expect(getSettingById("")).toBeUndefined();
      expect(getSettingById("   ")).toBeUndefined();
    });

    it("returns undefined for prototype pollution keys", () => {
      expect(getSettingById("__proto__")).toBeUndefined();
      expect(getSettingById("constructor")).toBeUndefined();
      expect(getSettingById("prototype")).toBeUndefined();
    });
  });

  // ── 8. getCategoryList Validation ─────────────────────────────────────────

  describe("getCategoryList & getCategories validation & boundaries", () => {
    it("returns ['all'] for non-array inputs", () => {
      expect(getCategoryList(null)).toEqual(["all"]);
      expect(getCategoryList(undefined)).toEqual(["all"]);
      expect(getCategoryList("notifications")).toEqual(["all"]);
      expect(getCategoryList(1234)).toEqual(["all"]);
      expect(getCategoryList({})).toEqual(["all"]);
    });

    it("returns ['all'] for empty array", () => {
      expect(getCategoryList([])).toEqual(["all"]);
    });

    it("filters out invalid, null, undefined, and empty category entries", () => {
      const dirty = [
        null,
        undefined,
        "not-an-object",
        { category: null },
        { category: undefined },
        { category: "" },
        { category: "   " },
        { category: 123 },
        { category: "notifications" },
        { category: "  display  " },
        { category: "notifications" }, // duplicate
      ];

      expect(getCategoryList(dirty)).toEqual(["all", "display", "notifications"]);
    });

    it("getCategories alias is strictly identical to getCategoryList", () => {
      expect(getCategories).toBe(getCategoryList);
    });
  });

  // ── 9. Observability & Scrubbed Diagnostics ───────────────────────────────

  describe("Observability & scrubbed diagnostic logging", () => {
    it("redacts sensitive keys from diagnostic log output", () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      logSettingsDiagnostic("Security alert", {
        userId: "usr-123",
        authToken: "bearer-xyz-12345",
        privateKey: "priv-stellar-secret",
        password: "my-secret-password",
        settingsCount: 25,
      });

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const [msg, payload] = consoleErrorSpy.mock.calls[0];

      expect(msg).toBe("[app/settings/lib] Security alert");
      expect(payload.userId).toBe("usr-123");
      expect(payload.settingsCount).toBe(25);
      expect(payload.authToken).toBe("[REDACTED]");
      expect(payload.privateKey).toBe("[REDACTED]");
      expect(payload.password).toBe("[REDACTED]");

      consoleErrorSpy.mockRestore();
    });

    it("converts Error objects to safe message/name pairs in diagnostic log", () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      const testError = new Error("Failed network response");
      logSettingsDiagnostic("Network failure", { error: testError });

      const [, payload] = consoleErrorSpy.mock.calls[0];
      expect(payload.error).toEqual({
        name: "Error",
        message: "Failed network response",
      });

      consoleErrorSpy.mockRestore();
    });
  });
});
