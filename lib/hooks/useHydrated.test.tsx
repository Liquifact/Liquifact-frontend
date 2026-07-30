/**
 * @jest-environment jsdom
 *
 * @file lib/hooks/useHydrated.test.tsx
 */

import { renderHook } from "@testing-library/react";
import { useHydrated } from "./useHydrated";

describe("useHydrated", () => {
  it("resolves to true after the first post-mount effect flush", () => {
    const { result } = renderHook(() => useHydrated());

    // @testing-library/react's renderHook flushes effects synchronously,
    // so by the time we inspect the hook it has already changed from
    // false -> true.
    expect(result.current).toBe(true);
  });
});
