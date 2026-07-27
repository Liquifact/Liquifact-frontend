"use client";

import { useCallback, useEffect, useId, useRef } from "react";
import Button from "./Button";
import { ALL_STATES } from "../lib/hooks/useBulkSelection";

/**
 * @file components/BulkActionsToolbar.jsx
 * Bulk action toolbar surfaced when at least one marketplace row is selected.
 *
 * Composition (left-to-right):
 *   - Tri-state select-all checkbox.
 *   - "N selected" live count (visually rendered + announced via aria-live).
 *   - Spacer-filling "Clear" action that resets the selection (also
 *     reachable via Escape while focus is in the toolbar).
 *   - "Export" action — non-destructive; emits a JSON blob download.
 *   - "Delete" action — destructive; gated behind a confirmation dialog by
 *     the parent so this component itself stays presentational.
 *
 * The toolbar renders nothing when `selectedCount` is 0 so that the
 * marketplace DOM is unchanged in the default (non-selection) state.
 *
 * Accessibility contract:
 *   - Toolbar is `role="toolbar"` with `aria-label` set to the descriptive
 *     toolbar label.
 *   - The select-all checkbox has a tri-state aria (`aria-checked` +
 *     `indeterminate` flag mirroring `allState`).
 *   - The count line is wrapped in a `role="status" aria-live="polite"`
 *     region so updates are announced without shifting focus.
 *   - All buttons share the shared Button component so focus rings and
 *     loading state are consistent across the app.
 *
 * Action handlers are injected so the toolbar stays a pure presentational
 * component — the parent owns all side effects (delete API call, file
 * download, toast, etc.).
 */
const DEFAULT_LABELS = {
  toolbarAria: "Bulk actions toolbar",
  selectAllAria: "Select all {total} invoices",
  selectAllLabel: "Select all ({selected}/{total})",
  selectedCount: "{selected} of {total} invoices selected.",
  clearSelection: "Clear",
  exportAction: "Export",
  exportingAction: "Exporting...",
  deleteAction: "Delete",
  deletingAction: "Deleting...",
};

export default function BulkActionsToolbar({
  selectedCount,
  visibleCount,
  allState,
  onToggleSelectAll,
  onClearSelection,
  onExport,
  onRequestDelete,
  labels,
  exporting = false,
  deleting = false,
}) {
  const safeLabels = { ...DEFAULT_LABELS, ...labels };
  const toolbarRef = useRef(null);
  const selectAllRef = useRef(null);
  const statusId = useId();

  // Keep the select-all checkbox's `indeterminate` flag in sync with the
  // tri-state value. `indeterminate` is a DOM property (not an HTML
  // attribute) so it has to be set imperatively in an effect.
  useEffect(() => {
    if (!selectAllRef.current) return;
    selectAllRef.current.indeterminate = allState === ALL_STATES.PARTIAL;
  }, [allState]);

  const handleToolbarKeyDown = useCallback(
    (event) => {
      // Escape from anywhere inside the toolbar clears the selection so
      // keyboard users have a single shortcut to back out without hunting
      // for the Clear button. Modifier-laden Escape is left untouched so
      // browser shortcuts keep working.
      if (event.key === "Escape" && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
        event.preventDefault();
        onClearSelection?.();
      }
    },
    [onClearSelection]
  );

  if (selectedCount === 0) return null;

  const ariaChecked =
    allState === ALL_STATES.ALL ? "true" : allState === ALL_STATES.PARTIAL ? "mixed" : "false";

  return (
    <section
      ref={toolbarRef}
      role="toolbar"
      aria-label={safeLabels?.toolbarAria}
      data-testid="bulk-actions-toolbar"
      onKeyDown={handleToolbarKeyDown}
      className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-cyan-700/50 bg-cyan-950/40 p-3 shadow-sm focus-within:ring-2 focus-within:ring-cyan-400"
    >
      {/* Tri-state select-all checkbox */}
      <label className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-100 hover:bg-slate-900/60 focus-within:ring-2 focus-within:ring-cyan-400 cursor-pointer">
        <input
          ref={selectAllRef}
          type="checkbox"
          checked={allState === ALL_STATES.ALL}
          // Mixed state mirrors `aria-checked="mixed"` semantics.
          aria-checked={ariaChecked}
          aria-label={safeLabels?.selectAllAria
            .replace("{selected}", String(selectedCount))
            .replace("{total}", String(visibleCount))}
          data-testid="bulk-select-all"
          onChange={() => onToggleSelectAll?.()}
          className="h-4 w-4 rounded border-slate-500 bg-slate-900 text-cyan-500 accent-cyan-400 focus:ring-cyan-400"
        />
        <span className="font-medium">
          {safeLabels?.selectAllLabel.replace("{selected}", String(selectedCount)).replace(
            "{total}",
            String(visibleCount)
          )}
        </span>
      </label>

      {/* Polite live region so screen-reader users hear the count change */}
      <p
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-testid="bulk-selection-count"
        className="sr-only"
      >
        {safeLabels?.selectedCount
          ?.replace("{selected}", String(selectedCount))
          ?.replace("{total}", String(visibleCount))}
      </p>

      <Button
        type="button"
        variant="secondary"
        onClick={onClearSelection}
        aria-label={safeLabels?.clearButton || "Clear selection"}
        data-testid="bulk-clear"
      >
        {safeLabels?.clearButton || "Clear"}
      </Button>

      <div className="ml-auto flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={onExport}
          loading={exporting}
          aria-label={safeLabels?.exportButtonAria || "Export selected invoices"}
          data-testid="bulk-export"
        >
          {safeLabels?.exportButton || "Export"}
        </Button>
        <Button
          type="button"
          variant="danger"
          onClick={onRequestDelete}
          loading={deleting}
          aria-label={(safeLabels?.deleteButtonAria || "Delete {count} selected invoices").replace(
            "{count}",
            String(selectedCount)
          )}
          data-testid="bulk-delete"
        >
          {(safeLabels?.deleteButton || "Delete ({count})").replace("{count}", String(selectedCount))}
        </Button>
      </div>
    </section>
  );
}

/**
 * Returns the toolbar's visible count label (useful for tests that need
 * the human-readable copy without re-implementing the replacements).
 *
 * @param {{ totalLabel: string, selectedLabel: string }} labels
 * @param {number} selectedCount
 * @param {number} visibleCount
 * @returns {string}
 */
export function formatToolbarCountLine(selectedCount, visibleCount) {
  // Mirrors the visible "Select N of M" text in the toolbar; kept simple
  // so unit tests don't need to mock `String.prototype.replace`.
  return `${selectedCount} of ${visibleCount} selected`;
}
