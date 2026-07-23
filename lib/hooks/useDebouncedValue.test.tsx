import { act, renderHook } from "@testing-library/react";
import useDebouncedValue from "./useDebouncedValue";

describe("useDebouncedValue", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("publishes a changed value after the delay", () => {
    const { result, rerender } = renderHook(({ value, delay }) => useDebouncedValue(value, delay), {
      initialProps: { value: "", delay: 300 },
    });

    rerender({ value: "acme", delay: 300 });

    act(() => jest.advanceTimersByTime(299));
    expect(result.current).toBe("");

    act(() => jest.advanceTimersByTime(1));
    expect(result.current).toBe("acme");
  });

  it("coalesces rapid changes and publishes only the latest value", () => {
    const { result, rerender } = renderHook(({ value, delay }) => useDebouncedValue(value, delay), {
      initialProps: { value: "", delay: 300 },
    });

    rerender({ value: "a", delay: 300 });
    act(() => jest.advanceTimersByTime(100));
    rerender({ value: "ab", delay: 300 });

    act(() => jest.advanceTimersByTime(299));
    expect(result.current).toBe("");

    act(() => jest.advanceTimersByTime(1));
    expect(result.current).toBe("ab");
  });

  it("clears the pending timer when unmounted", () => {
    const clearTimeoutSpy = jest.spyOn(global, "clearTimeout");
    const { unmount } = renderHook(() => useDebouncedValue("acme", 300));

    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });
});
