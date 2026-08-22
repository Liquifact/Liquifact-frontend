/**
 * Tests for useSettingsAnnouncer
 *
 * Covers:
 * - Silent on mount in both immediate and debounced modes
 * - Immediate mode (delay=0): live region updates in the same render pass
 * - Debounced mode (delay>0): announces only after the delay elapses
 * - Debounces rapid successive updates (only the last value lands)
 * - Announces zero-result messages correctly in both modes
 * - Cleans up pending timers on unmount (debounced mode)
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

  it("returns an empty string on mount — debounced mode (no announcement on initial render)", () => {
    const { result } = renderHook(() => useSettingsAnnouncer("5 invoices loaded"));
    expect(result.current).toBe("");
  });

  it("returns an empty string on mount — immediate mode (no announcement on initial render)", () => {
    const { result } = renderHook(() => useSettingsAnnouncer("5 invoices loaded", 0));
    expect(result.current).toBe("");
  });

  // ── Immediate mode (delay = 0) ─────────────────────────────────────────────

  it("immediate mode: reflects the new message in the same render pass", () => {
    const { result, rerender } = renderHook(
      ({ msg }: { msg: string }) => useSettingsAnnouncer(msg, 0),
      { initialProps: { msg: "initial" } }
    );

    rerender({ msg: "5 invoices loaded" });

    expect(result.current).toBe("5 invoices loaded");
  });

  it("immediate mode: announces a zero-result message right away", () => {
    const { result, rerender } = renderHook(
      ({ msg }: { msg: string }) => useSettingsAnnouncer(msg, 0),
      { initialProps: { msg: "initial" } }
    );

    rerender({ msg: "No invoices available" });

    expect(result.current).toBe("No invoices available");
  });

  it("immediate mode: announces an error message right away", () => {
    const { result, rerender } = renderHook(
      ({ msg }: { msg: string }) => useSettingsAnnouncer(msg, 0),
      { initialProps: { msg: "initial" } }
    );

    rerender({ msg: "Unable to load investable invoices." });

    expect(result.current).toBe("Unable to load investable invoices.");
  });

  it("immediate mode: tracks multiple successive changes", () => {
    const { result, rerender } = renderHook(
      ({ msg }: { msg: string }) => useSettingsAnnouncer(msg, 0),
      { initialProps: { msg: "initial" } }
    );

    rerender({ msg: "first" });
    expect(result.current).toBe("first");

    rerender({ msg: "second" });
    expect(result.current).toBe("second");
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

    // Second update resets the debounce window
    rerender({ msg: "final" });

    act(() => {
      jest.advanceTimersByTime(SETTINGS_ANNOUNCE_DELAY_MS / 2);
    });

    // Still inside the second debounce window
    expect(result.current).toBe("");

    act(() => {
      jest.advanceTimersByTime(SETTINGS_ANNOUNCE_DELAY_MS / 2);
    });

    expect(result.current).toBe("final");
  });

  it("debounced mode: announces zero-result messages after the delay", () => {
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
    // Default 300 ms has elapsed but custom 500 ms has not
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

    unmount();

    act(() => {
      jest.advanceTimersByTime(SETTINGS_ANNOUNCE_DELAY_MS * 2);
    });

    expect(result.current).toBe("");
  });
});
