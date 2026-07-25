"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

/**
 * @file lib/hooks/useBulkSelection.js
 * Pure React hook for managing bulk selection across a list of records.
 *
 * The hook owns:
 *   - `selectedIds`: Set<string> of currently selected ids.
 *   - Selection mutators: toggle / toggleById / selectAll / clear.
 *   - Derived counters and tri-state info (none / partial / all).
 *
 * Auto-pruning:
 *   When the underlying `items` reference (or content) changes, ids that are
 *   no longer present in the list are dropped from the selection so the
 *   "Select all" state always tracks the visible, valid dataset. This is
 *   critical when filtering, sorting, or removing items — without it, the
 *   selection becomes orphaned and "X selected" no longer matches the rows.
 *
 * Tri-state handling:
 *   The hook does NOT directly toggle the DOM `indeterminate` flag on the
 *   select-all checkbox. Consumers read `allState` ("none" / "partial" /
 *   "all") and apply `el.indeterminate = allState === "partial"` in a ref
 *   effect. We keep the hook independent of the DOM so it stays portable
 *   to non-React call sites and unit-testable in isolation.
 *
 * Stable item identity:
 *   The hook does not assume items have a stable order or identity beyond
 *   `item.id`. As long as the consumer keeps the same `id` for the same
 *   conceptual record, replacements of the array (e.g. optimistic updates)
 *   are handled correctly.
 */

const ALL_STATES = Object.freeze({
  NONE: "none",
  PARTIAL: "partial",
  ALL: "all",
});

/**
 * Build the set of currently visible ids for a given items array.
 * @param {Array<{id: string}>} items
 * @returns {Set<string>}
 */
function buildVisibleIds(items) {
  const ids = new Set();
  if (!Array.isArray(items)) return ids;
  for (const item of items) {
    if (item && typeof item.id === "string" && item.id.length > 0) {
      ids.add(item.id);
    }
  }
  return ids;
}

/**
 * Compute the tri-state bucket given selection size vs. visible size.
 * Visibly-hidden but-present items still count toward "all".
 *
 * @param {number} selectedCount
 * @param {number} visibleCount
 * @returns {"none" | "partial" | "all"}
 */
export function computeAllState(selectedCount, visibleCount) {
  if (visibleCount === 0) return ALL_STATES.NONE;
  if (selectedCount === 0) return ALL_STATES.NONE;
  if (selectedCount >= visibleCount) return ALL_STATES.ALL;
  return ALL_STATES.PARTIAL;
}

/**
 * Bulk selection hook.
 *
 * @param {Array<{id: string}>} items - Source list (filtered + sorted).
 * @returns {{
 *   selectedIds: Set<string>,
 *   selectedCount: number,
 *   visibleCount: number,
 *   allState: "none" | "partial" | "all",
 *   isSelected: (id: string) => boolean,
 *   toggle: (id: string) => void,
 *   selectAll: () => void,
 *   clear: () => void,
 * }}
 */
export default function useBulkSelection(items) {
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  // The previous items reference we have already pruned against. Comparing
  // references + a stringified snapshot catches both:
  //   - reference changes (new data, optimistic-removed items)
  //   - same-reference content changes (id churn inside an item)
  const itemsKey = useStableItemsKey(items);
  const visibleIds = useMemo(() => buildVisibleIds(items), [items]);

  // Auto-prune selection when items change.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- prune selection against an external id list that may change between renders; setState is unavoidable here */
    setSelectedIds((current) => {
      const next = new Set();
      for (const id of current) {
        if (visibleIds.has(id)) next.add(id);
      }
      // Only return a new Set when something was actually removed, so we
      // don't churn identity when the items reference is stable.
      if (next.size === current.size) return current;
      return next;
    });
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [itemsKey, visibleIds]);

  const toggle = useCallback(
    (id) => {
      if (typeof id !== "string" || id.length === 0) return;
      setSelectedIds((current) => {
        const next = new Set(current);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
    },
    []
  );

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(visibleIds));
  }, [visibleIds]);

  const clear = useCallback(() => {
    setSelectedIds((current) => {
      if (current.size === 0) return current;
      return new Set();
    });
  }, []);

  const isSelected = useCallback(
    (id) => selectedIds.has(id),
    [selectedIds]
  );

  const allState = computeAllState(selectedIds.size, visibleIds.size);

  return {
    selectedIds,
    selectedCount: selectedIds.size,
    visibleCount: visibleIds.size,
    allState,
    isSelected,
    toggle,
    selectAll,
    clear,
  };
}

/**
 * A stable string key for the items array. We settle for JSON.stringify
 * because the items in this product are flat POJOs (id/issuer/amount/etc.)
 * — fast enough at our volumes and lets us detect content churn cheaply.
 */
function useStableItemsKey(items) {
  return useMemo(() => {
    if (!Array.isArray(items)) return "";
    try {
      return JSON.stringify(items.map((it) => (it && it.id) || ""));
    } catch {
      return items.length;
    }
  }, [items]);
}

export { ALL_STATES };
