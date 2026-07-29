import React from "react";
import { act, renderHook } from "@testing-library/react";
import "@testing-library/jest-dom";
import useBulkSelection, { computeAllState, ALL_STATES } from "./useBulkSelection";

const INVOICES = [
  { id: "inv-a", issuer: "A" },
  { id: "inv-b", issuer: "B" },
  { id: "inv-c", issuer: "C" },
];

describe("computeAllState", () => {
  it("returns 'none' when no items are visible", () => {
    expect(computeAllState(0, 0)).toBe(ALL_STATES.NONE);
    expect(computeAllState(5, 0)).toBe(ALL_STATES.NONE);
  });

  it("returns 'none' when no items are selected", () => {
    expect(computeAllState(0, 5)).toBe(ALL_STATES.NONE);
  });

  it("returns 'all' when every visible item is selected", () => {
    expect(computeAllState(3, 3)).toBe(ALL_STATES.ALL);
    expect(computeAllState(7, 7)).toBe(ALL_STATES.ALL);
  });

  it("returns 'partial' when some but not all items are selected", () => {
    expect(computeAllState(1, 3)).toBe(ALL_STATES.PARTIAL);
    expect(computeAllState(2, 5)).toBe(ALL_STATES.PARTIAL);
  });
});

describe("useBulkSelection", () => {
  it("starts with no selection", () => {
    const { result } = renderHook(({ items }) => useBulkSelection(items), {
      initialProps: { items: INVOICES },
    });
    expect(result.current.selectedCount).toBe(0);
    expect(result.current.allState).toBe(ALL_STATES.NONE);
    expect(result.current.visibleCount).toBe(3);
  });

  it("toggle adds and removes an id", () => {
    const { result } = renderHook(({ items }) => useBulkSelection(items), {
      initialProps: { items: INVOICES },
    });
    act(() => result.current.toggle("inv-a"));
    expect(result.current.selectedIds.has("inv-a")).toBe(true);
    expect(result.current.selectedCount).toBe(1);
    expect(result.current.allState).toBe(ALL_STATES.PARTIAL);

    act(() => result.current.toggle("inv-a"));
    expect(result.current.selectedIds.has("inv-a")).toBe(false);
    expect(result.current.selectedCount).toBe(0);
    expect(result.current.allState).toBe(ALL_STATES.NONE);
  });

  it("toggle ignores empty / non-string ids", () => {
    const { result } = renderHook(({ items }) => useBulkSelection(items), {
      initialProps: { items: INVOICES },
    });
    act(() => {
      result.current.toggle("");
      result.current.toggle(null);
      result.current.toggle(undefined);
      result.current.toggle(42);
    });
    expect(result.current.selectedCount).toBe(0);
  });

  it("isSelected reflects membership", () => {
    const { result } = renderHook(({ items }) => useBulkSelection(items), {
      initialProps: { items: INVOICES },
    });
    act(() => result.current.toggle("inv-b"));
    expect(result.current.isSelected("inv-b")).toBe(true);
    expect(result.current.isSelected("inv-a")).toBe(false);
  });

  it("selectAll installs every visible id", () => {
    const { result } = renderHook(({ items }) => useBulkSelection(items), {
      initialProps: { items: INVOICES },
    });
    act(() => result.current.selectAll());
    expect(result.current.selectedCount).toBe(3);
    expect(result.current.allState).toBe(ALL_STATES.ALL);
    expect(result.current.isSelected("inv-a")).toBe(true);
    expect(result.current.isSelected("inv-b")).toBe(true);
    expect(result.current.isSelected("inv-c")).toBe(true);
  });

  it("clear empties the selection", () => {
    const { result } = renderHook(({ items }) => useBulkSelection(items), {
      initialProps: { items: INVOICES },
    });
    act(() => result.current.selectAll());
    act(() => result.current.clear());
    expect(result.current.selectedCount).toBe(0);
    expect(result.current.selectedIds.size).toBe(0);
    expect(result.current.allState).toBe(ALL_STATES.NONE);
  });

  it("clear on empty selection is idempotent", () => {
    const { result } = renderHook(({ items }) => useBulkSelection(items), {
      initialProps: { items: INVOICES },
    });
    const beforeIds = result.current.selectedIds;
    act(() => result.current.clear());
    // The hook optimises: when nothing is selected, clear() keeps the same Set reference.
    expect(result.current.selectedIds).toBe(beforeIds);
  });

  it("auto-prunes selection when an item id disappears between renders", () => {
    const { result, rerender } = renderHook(({ items }) => useBulkSelection(items), {
      initialProps: { items: INVOICES },
    });
    act(() => result.current.selectAll());
    expect(result.current.selectedCount).toBe(3);

    // Remove one item and re-render — that id should be pruned from the selection.
    rerender({
      items: INVOICES.filter((it) => it.id !== "inv-b"),
    });
    expect(result.current.isSelected("inv-b")).toBe(false);
    expect(result.current.selectedCount).toBe(2);
    expect(result.current.allState).toBe(ALL_STATES.ALL);
  });

  it("treats empty items as zero visible", () => {
    const { result } = renderHook(({ items }) => useBulkSelection(items), {
      initialProps: { items: [] },
    });
    expect(result.current.visibleCount).toBe(0);
    expect(result.current.selectedCount).toBe(0);
    expect(result.current.allState).toBe(ALL_STATES.NONE);
  });

  it("tolerates a non-array items input", () => {
    const { result } = renderHook(({ items }) => useBulkSelection(items), {
      initialProps: { items: undefined },
    });
    expect(result.current.visibleCount).toBe(0);
    expect(result.current.allState).toBe(ALL_STATES.NONE);
  });

  it("skips entries without a string id", () => {
    const bad = [{ id: "ok" }, { id: "" }, { id: null }, { issuer: "no id" }, null];
    const { result } = renderHook(({ items }) => useBulkSelection(items), {
      initialProps: { items: bad },
    });
    expect(result.current.visibleCount).toBe(1);
    expect(result.current.isSelected("ok")).toBe(false);
  });

  it("repeated toggles cycle in and out of selection", () => {
    const { result } = renderHook(({ items }) => useBulkSelection(items), {
      initialProps: { items: INVOICES },
    });
    for (let i = 0; i < 4; i += 1) {
      act(() => result.current.toggle("inv-a"));
    }
    expect(result.current.isSelected("inv-a")).toBe(false);
  });

  it("returns stable references until the underlying state changes", () => {
    const { result } = renderHook(({ items }) => useBulkSelection(items), {
      initialProps: { items: INVOICES },
    });
    const initial = result.current;
    // Re-render with same items — references stay stable.
    act(() => {});
    expect(result.current.selectedIds).toBe(initial.selectedIds);
  });
});
