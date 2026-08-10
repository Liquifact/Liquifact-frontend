"use client";

/**
 * @file app/invest/[id]/InvoiceDetailItems.jsx
 *
 * Bulk-selectable list of invoice-detail documents (PDF, proof of delivery,
 * payment terms, etc.) on the invoice detail page.
 *
 * Composition:
 *   - Tri-state select-all via shared `BulkActionsToolbar`
 *   - Per-row checkboxes (keyboard accessible, labelled)
 *   - Non-destructive Export (JSON download)
 *   - Destructive Delete gated behind `ConfirmDialog`
 *   - Results announced via toast + the toolbar's polite live region
 *
 * Selection auto-prunes when items are deleted (via `useBulkSelection`).
 */

import { useCallback, useState } from "react";
import BulkActionsToolbar from "@/components/BulkActionsToolbar";
import ConfirmDialog from "@/components/ConfirmDialog";
import useBulkSelection, { ALL_STATES } from "@/lib/hooks/useBulkSelection";
import { copy } from "@/app/copy/en";

const bulkLabels = copy.invest.detail.bulk;

/**
 * Build the default set of detail documents for an invoice.
 * Pure helper — safe to call from Server Components.
 *
 * @param {{ id: string, issuer?: string } | null | undefined} invoice
 * @returns {Array<{ id: string, name: string, kind: string, issuer: string }>}
 */
export function buildInvoiceDetailItems(invoice) {
  if (!invoice || typeof invoice.id !== "string" || invoice.id.length === 0) {
    return [];
  }
  const issuer = invoice.issuer || "Unknown issuer";
  return [
    {
      id: `${invoice.id}-doc-invoice`,
      name: "Invoice PDF",
      kind: "document",
      issuer,
    },
    {
      id: `${invoice.id}-doc-pod`,
      name: "Proof of delivery",
      kind: "document",
      issuer,
    },
    {
      id: `${invoice.id}-doc-terms`,
      name: "Payment terms",
      kind: "document",
      issuer,
    },
  ];
}

/**
 * Default JSON export for selected detail items.
 * Degrades gracefully in jsdom / SSR (no `URL.createObjectURL`).
 *
 * @param {Array<object>} selectedItems
 * @returns {{ count: number }}
 */
export function defaultDetailBulkExport(selectedItems) {
  const safeRecords = Array.isArray(selectedItems) ? selectedItems : [];
  if (
    typeof URL === "undefined" ||
    typeof URL.createObjectURL !== "function" ||
    typeof document === "undefined"
  ) {
    return { count: safeRecords.length };
  }
  const json = JSON.stringify(
    { exportedAt: new Date().toISOString(), items: safeRecords },
    null,
    2
  );
  const blob = new Blob([json], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `liquifact-invoice-detail-${Date.now()}.json`;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return { count: safeRecords.length };
}

/**
 * Default delete — resolves with the deleted count. Parent owns list mutation.
 *
 * @param {Set<string>|Array<string>} ids
 * @returns {Promise<{ count: number }>}
 */
export async function defaultDetailBulkDelete(ids) {
  const count = ids instanceof Set ? ids.size : Array.isArray(ids) ? ids.length : 0;
  return { count };
}

/**
 * @param {object} props
 * @param {Array<{id:string,name:string,kind?:string,issuer?:string}>} props.initialItems
 * @param {(ids: Set<string>) => Promise<{count?: number}>} [props.onBulkDelete]
 * @param {(items: Array<object>) => {count?: number}} [props.onBulkExport]
 * @param {{ success?: Function, error?: Function, info?: Function }} [props.toast]
 */
export default function InvoiceDetailItems({
  initialItems = [],
  onBulkDelete = defaultDetailBulkDelete,
  onBulkExport = defaultDetailBulkExport,
  toast: toastApi = null,
}) {
  const [items, setItems] = useState(() =>
    Array.isArray(initialItems) ? initialItems.slice() : []
  );
  const [pendingDeleteIds, setPendingDeleteIds] = useState(null);
  const [bulkRunning, setBulkRunning] = useState({ export: false, delete: false });

  const {
    selectedIds,
    selectedCount,
    visibleCount,
    allState,
    isSelected,
    toggle,
    selectAll,
    clear,
  } = useBulkSelection(items);

  const handleToggleSelectAll = useCallback(() => {
    if (allState === ALL_STATES.ALL) {
      clear();
    } else {
      selectAll();
    }
  }, [allState, clear, selectAll]);

  const handleRequestDelete = useCallback(() => {
    setPendingDeleteIds(new Set(selectedIds));
  }, [selectedIds]);

  const handleCancelDelete = useCallback(() => {
    setPendingDeleteIds(null);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    const idsToDelete = pendingDeleteIds;
    if (!idsToDelete || idsToDelete.size === 0) {
      setPendingDeleteIds(null);
      return;
    }
    setBulkRunning((prev) => ({ ...prev, delete: true }));
    try {
      await onBulkDelete(idsToDelete);
      setItems((current) => current.filter((item) => !idsToDelete.has(item.id)));
      const plural = idsToDelete.size === 1 ? "" : "s";
      toastApi?.success?.(
        bulkLabels.deleteSuccessMsg
          .replace("{count}", String(idsToDelete.size))
          .replace("{plural}", plural),
        bulkLabels.deleteSuccessTitle
      );
      setPendingDeleteIds(null);
    } catch {
      toastApi?.error?.(bulkLabels.deleteErrorMsg, bulkLabels.deleteErrorTitle);
    } finally {
      setBulkRunning((prev) => ({ ...prev, delete: false }));
    }
  }, [pendingDeleteIds, onBulkDelete, toastApi]);

  const handleExport = useCallback(() => {
    if (selectedIds.size === 0) {
      toastApi?.info?.(bulkLabels.exportEmptyMsg, bulkLabels.exportSuccessTitle);
      return;
    }
    setBulkRunning((prev) => ({ ...prev, export: true }));
    try {
      const selectedSlice = items.filter((item) => selectedIds.has(item.id));
      const result = onBulkExport(selectedSlice) || { count: selectedSlice.length };
      const exportCount = result.count ?? selectedSlice.length;
      const plural = exportCount === 1 ? "" : "s";
      toastApi?.success?.(
        bulkLabels.exportSuccessMsg
          .replace("{count}", String(exportCount))
          .replace("{plural}", plural),
        bulkLabels.exportSuccessTitle
      );
    } finally {
      setBulkRunning((prev) => ({ ...prev, export: false }));
    }
  }, [selectedIds, items, onBulkExport, toastApi]);

  if (items.length === 0) {
    return null;
  }

  const deleteDialogOpen = pendingDeleteIds !== null;

  /* invoice-detail-items-section / -heading / -sub: CSS hooks for
     @media (forced-colors) and @media (prefers-contrast: more) rules in
     globals.css (issue #929). */
  return (
    <section
      aria-labelledby="invoice-detail-items-heading"
      className="invoice-detail-items-section no-print mb-6 rounded-xl border border-slate-800 bg-slate-900/50 p-6"
      data-testid="invoice-detail-items"
    >
      <h2 id="invoice-detail-items-heading" className="invoice-detail-items-heading text-base font-semibold text-slate-100 mb-4">
        {bulkLabels.sectionHeading}
      </h2>
      <p className="invoice-detail-items-sub text-sm text-slate-400 mb-4">{bulkLabels.sectionSub}</p>

      <BulkActionsToolbar
        selectedCount={selectedCount}
        visibleCount={visibleCount}
        allState={allState}
        onToggleSelectAll={handleToggleSelectAll}
        onClearSelection={clear}
        onExport={handleExport}
        onRequestDelete={handleRequestDelete}
        labels={bulkLabels}
        exporting={bulkRunning.export}
        deleting={bulkRunning.delete}
      />

      <ul aria-label={bulkLabels.listAriaLabel} className="space-y-3">
        {items.map((item) => {
          const checked = isSelected(item.id);
          const checkboxAria = bulkLabels.rowCheckboxAria
            .replace("{name}", item.name)
            .replace("{id}", item.id);
          return (
            <li
              key={item.id}
              data-testid={`detail-item-row-${item.id}`}
              data-selected={checked ? "true" : "false"}
              className={[
                "invoice-detail-items-row flex items-center gap-3 rounded-lg border p-3 transition-colors",
                checked ? "border-cyan-700/60 bg-cyan-950/30" : "border-slate-800 bg-slate-950/40",
              ].join(" ")}
            >
              <label className="inline-flex items-center gap-3 cursor-pointer min-w-0 flex-1">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(item.id)}
                  aria-label={checkboxAria}
                  data-testid={`detail-item-checkbox-${item.id}`}
                  className="h-4 w-4 flex-shrink-0 rounded border-slate-600 bg-slate-900 text-cyan-500 accent-cyan-400 focus-ring"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-slate-100 truncate">
                    {item.name}
                  </span>
                  <span className="block text-xs text-slate-500 truncate">{item.id}</span>
                </span>
              </label>
              <span className="text-xs uppercase tracking-wide text-slate-500 flex-shrink-0">
                {item.kind || "document"}
              </span>
            </li>
          );
        })}
      </ul>

      <ConfirmDialog
        open={deleteDialogOpen}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title={bulkLabels.deleteConfirmTitle}
        description={
          pendingDeleteIds
            ? bulkLabels.deleteConfirmBody
                .replace("{count}", String(pendingDeleteIds.size))
                .replace("{plural}", pendingDeleteIds.size === 1 ? "" : "s")
            : ""
        }
        confirmLabel={
          pendingDeleteIds
            ? bulkLabels.deleteConfirmConfirmLabel
                .replace("{count}", String(pendingDeleteIds.size))
                .replace("{plural}", pendingDeleteIds.size === 1 ? "" : "s")
            : "Delete"
        }
        cancelLabel={bulkLabels.deleteConfirmCancelLabel}
        variant="danger"
        confirmLoading={bulkRunning.delete}
      />
    </section>
  );
}
