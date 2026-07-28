import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, beforeEach, afterEach, jest } from "@jest/globals";
import { useDebouncedValue } from "./useDebouncedValue";

describe("useDebouncedValue", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("updates the debounced value after the specified delay", () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 500), {
      initialProps: { value: "initial" },
    });

    expect(result.current).toBe("initial");

    rerender({ value: "updated" });

    // The value should not update immediately.
    expect(result.current).toBe("initial");

    act(() => {
      jest.advanceTimersByTime(499);
    });

    expect(result.current).toBe("initial");

    act(() => {
      jest.advanceTimersByTime(1);
    });

    expect(result.current).toBe("updated");
  });

  it("coalesces rapid successive changes into the latest value", () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 500), {
      initialProps: { value: "" },
    });

    rerender({ value: "c" });

    act(() => {
      jest.advanceTimersByTime(100);
    });

    rerender({ value: "cr" });

    act(() => {
      jest.advanceTimersByTime(100);
    });

    rerender({ value: "cre" });

    act(() => {
      jest.advanceTimersByTime(100);
    });

    rerender({ value: "cred" });

    // The debounced value should still be the initial value.
    expect(result.current).toBe("");

    // Wait for the final debounce period.
    act(() => {
      jest.advanceTimersByTime(500);
    });

    // Only the latest value should be emitted.
    expect(result.current).toBe("cred");
  });

  it("cleans up the pending timer when unmounted", () => {
    const { result, rerender, unmount } = renderHook(({ value }) => useDebouncedValue(value, 500), {
      initialProps: { value: "initial" },
    });

    rerender({ value: "updated" });

    expect(result.current).toBe("initial");

    // Unmount before the debounce delay completes.
    unmount();

    act(() => {
      jest.advanceTimersByTime(500);
    });

    // The pending timer should have been cancelled.
    expect(result.current).toBe("initial");
  });

  it("handles immediate unmount without throwing", () => {
    const { unmount } = renderHook(() => useDebouncedValue("value", 500));

    expect(() => unmount()).not.toThrow();

    act(() => {
      jest.runAllTimers();
    });
  });
});
