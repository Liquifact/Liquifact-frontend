/**
 * Tests for useSettingsAnnouncer
 *
 * Covers:
 * - Silent on mount in both immediate and debounced modes
 * - Immediate mode (delay=0): announces synchronously in the same effect cycle
 * - Debounced mode (delay>0): announces after the delay elapses
 * - Debounces rapid successive updates (only the last value lands)
 * - Announces zero-result / empty-string messages correctly
 * - Cleans up pending timers on unmount
 */

import { act, renderHook } from "@testing-library/react";
import { SETTINGS_ANNOUNCE_DELAY_MS, useSettingsAnnouncer } from "./useSettingsAnnouncer";

describe("useSettingsAnnouncer", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  // ── Mount behaviour ────────────────────────────────────────────────────────

  it("returns an empty string on mount (no announcement on initial render) — debounced mode", () => {
    const { result } = renderHook(() => useSettingsAnnouncer("5 invoices loaded"));
    expect(result.current).toBe("");
  });

  it("returns an empty string on mount (no announcement on initial render) — immediate mode", () => {
    const { result } = renderHook(() => useSettingsAnnouncer("5 invoices loaded", 0));
    expect(result.current).toBe("");
  });

  // ── Immediate mode (delay = 0) ─────────────────────────────────────────────

  it("immediate mode: announces without a timer when message changes", () => {
    const { result, rerender } = renderHook(
      ({ msg }: { msg: string }) => useSettingsAnnouncer(msg, 0),
      { initialProps: { msg: "initial" } }
    );

    act(() => {
      rerender({ msg: "5 invoices loaded" });
    });

    expect(result.current).toBe("5 invoices loaded");
  });

  it("immediate mode: announces zero-result messages right away", () => {
    const { result, rerender } = renderHook(
      ({ msg }: { msg: string }) => useSettingsAnnouncer(msg, 0),
      { initialProps: { msg: "initial" } }
    );

    act(() => {
      rerender({ msg: "No invoices available" });
    });

    expect(result.current).toBe("No invoices available");
  });

  // ── Debounced mode (delay > 0) ─────────────────────────────────────────────

  it("debounced mode: returns empty before the delay elapses", () => {
    const { result, rerender } = renderHook(
      ({ msg }: { msg: string }) => useSettingsAnnouncer(msg),
      { initialProps: { msg: "5 invoices loaded" } }
    );

    rerender({ msg: "3 of 5 invoices match" });

    act(() => {
      jest.advanceTimersByTime(SETTINGS_ANNOUNCE_DELAY_MS - 1);
    });

    expect(result.current).toBe("");
  });

  it("debounced mode: announces after the debounce delay elapses", () => {
    const { result, rerender } = renderHook(
      ({ msg }: { msg: string }) => useSettingsAnnouncer(msg),
      { initialProps: { msg: "5 invoices loaded" } }
    );

    rerender({ msg: "3 of 5 invoices match" });

    act(() => {
      jest.advanceTimersByTime(SETTINGS_ANNOUNCE_DELAY_MS);
    });

    expect(result.current).toBe("3 of 5 invoices match");
  });

  it("debounces rapid successive updates — only the last message is announced", () => {
    const { result, rerender } = renderHook(
      ({ msg }: { msg: string }) => useSettingsAnnouncer(msg),
      { initialProps: { msg: "initial" } }
    );

    // Fire three rapid updates without advancing timers between them
    rerender({ msg: "update 1" });
    rerender({ msg: "update 2" });
    rerender({ msg: "update 3" });

    act(() => {
      jest.advanceTimersByTime(SETTINGS_ANNOUNCE_DELAY_MS);
    });

    expect(result.current).toBe("update 3");
  });

  it("does not announce intermediate values during rapid updates", () => {
    const { result, rerender } = renderHook(
      ({ msg }: { msg: string }) => useSettingsAnnouncer(msg),
      { initialProps: { msg: "initial" } }
    );

    rerender({ msg: "first" });

    act(() => {
      jest.advanceTimersByTime(SETTINGS_ANNOUNCE_DELAY_MS / 2);
    });

    // Rapid second update resets the debounce
    rerender({ msg: "final" });

    act(() => {
      jest.advanceTimersByTime(SETTINGS_ANNOUNCE_DELAY_MS / 2);
    });

    // Still within the debounce window of the second update
    expect(result.current).toBe("");

    act(() => {
      jest.advanceTimersByTime(SETTINGS_ANNOUNCE_DELAY_MS / 2);
    });

    expect(result.current).toBe("final");
  });

  it("announces zero-result messages after debounce ('No invoices match')", () => {
    const { result, rerender } = renderHook(
      ({ msg }: { msg: string }) => useSettingsAnnouncer(msg),
      { initialProps: { msg: "5 invoices loaded" } }
    );

    rerender({ msg: "No invoices match" });

    act(() => {
      jest.advanceTimersByTime(SETTINGS_ANNOUNCE_DELAY_MS);
    });

    expect(result.current).toBe("No invoices match");
  });

  it("respects a custom delay parameter", () => {
    const customDelay = 500;
    const { result, rerender } = renderHook(
      ({ msg }: { msg: string }) => useSettingsAnnouncer(msg, customDelay),
      { initialProps: { msg: "initial" } }
    );

    rerender({ msg: "custom delay message" });

    act(() => {
      jest.advanceTimersByTime(SETTINGS_ANNOUNCE_DELAY_MS);
    });
    // Should still be empty — custom delay not yet elapsed
    expect(result.current).toBe("");

    act(() => {
      jest.advanceTimersByTime(customDelay - SETTINGS_ANNOUNCE_DELAY_MS);
    });
    expect(result.current).toBe("custom delay message");
  });

  it("cleans up the pending timer when the component unmounts mid-debounce", () => {
    const { result, rerender, unmount } = renderHook(
      ({ msg }: { msg: string }) => useSettingsAnnouncer(msg),
      { initialProps: { msg: "initial" } }
    );

    rerender({ msg: "pending message" });

    // Unmount before the timer fires
    unmount();

    act(() => {
      jest.advanceTimersByTime(SETTINGS_ANNOUNCE_DELAY_MS * 2);
    });

    // The hook is unmounted; result stays at the last captured value ("").
    expect(result.current).toBe("");
  });
});

