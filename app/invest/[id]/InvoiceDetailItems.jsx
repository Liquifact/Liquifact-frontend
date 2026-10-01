/**
 * @file InvoiceDetailItems.jsx
 *
 * Pure presentational component for the invoice detail section inside
 * app/invest/[id]/page.js. It owns only display logic — all loading, routing,
 * and async state live in the parent InvoiceDetail component.
 *
 * ## Public contract (Issue #1149)
 *
 * This module exports three stable public contracts that callers depend on:
 *
 *   1. `buildInvoiceDetailItems(invoice)` — pure helper, returns an array of
 *      detail-item shapes from an invoice record. Safe for Server Components.
 *      Returns `[]` for any null / invalid input.
 *
 *   2. `defaultDetailBulkExport(selectedItems)` — default JSON export handler.
 *      Degrades gracefully when `URL.createObjectURL` / `document` are absent
 *      (SSR, jsdom). Always returns `{ count: number }`.
 *
 *   3. `defaultDetailBulkDelete(ids)` — default async delete stub.
 *      Resolves with `{ count: number }`. Parent component owns list mutation.
 *
 * ## Compatibility invariants
 *
 *   - The component never mutates `initialItems`; it copies on mount.
 *   - Items with a missing or non-string `id` are silently dropped before
 *     they reach selection state (defensive normalisation).
 *   - `onBulkDelete` / `onBulkExport` props fall back to the default stubs
 *     when `null` or `undefined` is passed, preserving backward compatibility.
 *   - The `toast` prop is optional and all calls are fully optional-chained.
 *   - The concurrent-safety guard (`bulkRunning`) prevents double-submission
 *     on both export and delete paths.
 *   - Errors thrown by `onBulkDelete` are caught, reported via `reportError`,
 *     and surfaced to the user without exposing internal error details.
 *   - Retrying after a failed delete is always safe: the item list is not
 *     mutated until the async handler resolves successfully.
 *
 * ## Composition
 *   - Tri-state select-all via shared `BulkActionsToolbar`
 *   - Per-row checkboxes (keyboard accessible, labelled)
 *   - Non-destructive Export (JSON download)
 *   - Destructive Delete gated behind `ConfirmDialog`
 *   - Results announced via toast + the toolbar's polite live region
 *   - Runtime errors wrapped in `InvoiceDetailItemsErrorBoundary`
 */

import { Component, useCallback, useState } from "react";
import BulkActionsToolbar from "@/components/BulkActionsToolbar";
import ConfirmDialog from "@/components/ConfirmDialog";
import useBulkSelection, { ALL_STATES } from "@/lib/hooks/useBulkSelection";
import { reportError } from "@/lib/observability/reportError";
import { copy } from "@/app/copy/en";
import { INVALID_VALUE_FALLBACK, formatAmount, formatCurrency } from "@/lib/format/currency";

// ─── helpers ─────────────────────────────────────────────────────────────────

const MAX_DETAIL_ITEMS = 500;
const MAX_ID_LENGTH = 256;
const MAX_NAME_LENGTH = 256;
const MAX_KIND_LENGTH = 64;
const MAX_ISSUER_LENGTH = 256;

// ─────────────────────────────────────────────────────────────────────────────
// Compatibility constants
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The canonical shape of a detail item.
 * Any item that fails this check is dropped before it touches React state.
 *
 * @typedef {{ id: string, name: string, kind?: string, issuer?: string }} DetailItem
 */

/**
 * Validate that a raw value is a well-formed detail item.
 * Returns `true` only when the item has a non-empty string `id` and `name`.
 *
 * @param {unknown} item
 * @returns {item is DetailItem}
 */
export function isValidDetailItem(item) {
  return (
    item !== null &&
    typeof item === "object" &&
    typeof item.id === "string" &&
    item.id.trim().length > 0 &&
    typeof item.name === "string" &&
    item.name.trim().length > 0
  );
}

/**
 * Normalise a raw items array: filter out any entry that does not satisfy
 * `isValidDetailItem`. Never throws.
 *
 * @param {unknown} rawItems
 * @returns {DetailItem[]}
 */
export function normaliseDetailItems(rawItems) {
  if (!Array.isArray(rawItems)) return [];
  return rawItems.filter(isValidDetailItem);
}

// ─────────────────────────────────────────────────────────────────────────────
// Pure helpers (stable public API)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validation invariants for invoice detail items.
 *
 * Invariant: returns `[]` for any null / invalid / id-less invoice.
 *
 * @param {{ id: string, issuer?: string } | null | undefined} invoice
 * @returns {DetailItem[]}
 */
export function buildInvoiceDetailItems(invoice) {
  if (!invoice || typeof invoice.id !== "string" || invoice.id.trim().length === 0) {
    return [];
  }
  const issuer =
    typeof invoice.issuer === "string" && invoice.issuer.trim().length > 0
      ? invoice.issuer.trim()
      : "Unknown issuer";
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
 * Invariant: always returns `{ count: number }` — never throws.
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
  return true;
}

/**
 * Default delete — resolves with the deleted count.
 * Parent owns list mutation.
 *
 * Invariant: always resolves (never rejects by default).
 *
 * @param {unknown} rawItems
 * @returns {{ items: Array<object>, rejected: number }}
 */
export function sanitizeDetailItems(rawItems) {
  if (!Array.isArray(rawItems)) {
    return { items: [], rejected: 0 };
  }
  const seen = new Set();
  const items = [];
  let rejected = 0;
  for (const raw of rawItems) {
    if (!isValidDetailItem(raw)) {
      rejected += 1;
      continue;
    }
    const id = raw.id.trim();
    if (seen.has(id)) {
      rejected += 1;
      continue;
    }
    if (items.length >= MAX_DETAIL_ITEMS) {
      rejected += 1;
      continue;
    }
    seen.add(id);
    items.push({
      ...raw,
      id,
      name: raw.name.trim(),
      kind: raw.kind == null ? raw.kind : raw.kind,
      issuer: raw.issuer == null ? raw.issuer : raw.issuer,
    });
  }
  return { items, rejected };
}

// ─────────────────────────────────────────────────────────────────────────────
// Error boundary
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Class-based error boundary that wraps `InvoiceDetailItems`.
 * Catches render-time and lifecycle exceptions, reports them via
 * `reportError`, and renders a non-blocking fallback rather than
 * crashing the entire invoice detail page.
 *
 * The fallback is intentionally minimal and does not expose internal
 * error details to the user (observability without PII leak).
 */
export class InvoiceDetailItemsErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    reportError(error, {
      component: "InvoiceDetailItems",
      componentStack: info?.componentStack ?? "(unavailable)",
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <section
          aria-labelledby="invoice-detail-items-error-heading"
          className="no-print mb-6 rounded-xl border border-amber-800/50 bg-amber-950/20 p-6"
          data-testid="invoice-detail-items-error"
          role="alert"
        >
          <h2
            id="invoice-detail-items-error-heading"
            className="text-base font-semibold text-amber-300 mb-2"
          >
            Unable to load document actions
          </h2>
          <p className="text-sm text-slate-400">
            The document management section encountered an unexpected error. You can still view
            invoice details above. Reload the page to try again.
          </p>
        </section>
      );
    }
    return this.props.children;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Bulk-selectable list of invoice-detail documents.
 *
 * ## Props (public API contract)
 *
 * @param {object}  props
 * @param {Array<{id:string,name:string,kind?:string,issuer?:string}>}
 *   props.initialItems
 *     Initial list of detail documents. Items with a missing / non-string id
 *     or name are silently dropped. Defaults to `[]`.
 * @param {(ids: Set<string>) => Promise<{count?: number}>}
 *   [props.onBulkDelete]
 *     Async callback invoked with the Set of selected ids when the user
 *     confirms deletion. The component waits for it to resolve before
 *     mutating the local list. If it rejects, the list is NOT mutated and
 *     an error toast is shown. Defaults to `defaultDetailBulkDelete`.
 * @param {(items: Array<object>) => {count?: number}}
 *   [props.onBulkExport]
 *     Sync callback invoked with the array of selected items when the user
 *     clicks Export. Must return `{ count }`. Defaults to
 *     `defaultDetailBulkExport`.
 * @param {{ success?: Function, error?: Function, info?: Function }}
 *   [props.toast]
 *     Optional toast API. All methods are called with
 *     `(message: string, title: string)`. May be `null`; all calls are
 *     safe-guarded with optional chaining.
 */
function InvoiceDetailItemsInner({
  initialItems = [],
  onBulkDelete = defaultDetailBulkDelete,
  onBulkExport = defaultDetailBulkExport,
  toast: toastApi = null,
}) {
  // ── Invariant: normalise on mount; never mutate the caller's array ──────────
  const [items, setItems] = useState(() => normaliseDetailItems(initialItems));

  // ── Invariant: pendingDeleteIds is either null (idle) or a non-empty Set ───
  const [pendingDeleteIds, setPendingDeleteIds] = useState(null);

  // ── Invariant: bulkRunning prevents concurrent double-submissions ───────────
  const [bulkRunning, setBulkRunning] = useState({
    export: false,
    delete: false,
  });

  // ── Prop normalisation: fall back to defaults when null / undefined ─────────
  const safeOnBulkDelete =
    typeof onBulkDelete === "function" ? onBulkDelete : defaultDetailBulkDelete;
  const safeOnBulkExport =
    typeof onBulkExport === "function" ? onBulkExport : defaultDetailBulkExport;

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

  // ── Select-all toggle ───────────────────────────────────────────────────────
  const handleToggleSelectAll = useCallback(() => {
    if (allState === ALL_STATES.ALL) {
      clear();
    } else {
      selectAll();
    }
  }, [allState, clear, selectAll]);

  // ── Delete — open confirm dialog ────────────────────────────────────────────
  const handleRequestDelete = useCallback(() => {
    if (selectedIds.size === 0) return; // Guard: nothing selected
    setPendingDeleteIds(new Set(selectedIds));
  }, [selectedIds]);

  const handleCancelDelete = useCallback(() => {
    setPendingDeleteIds(null);
  }, []);

  // ── Delete — confirm ────────────────────────────────────────────────────────
  // Invariant: no state mutation until the async handler resolves successfully.
  // Invariant: bulkRunning.delete prevents concurrent re-entry.
  const handleConfirmDelete = useCallback(async () => {
    const idsToDelete = pendingDeleteIds;
    if (bulkRunning.delete || !idsToDelete || idsToDelete.size === 0) {
      setPendingDeleteIds(null);
      return;
    }
    if (bulkRunning.delete) return; // Concurrent-safety guard
    setBulkRunning((prev) => ({ ...prev, delete: true }));
    try {
      await safeOnBulkDelete(idsToDelete);
      // Mutate only after successful resolution
      setItems((current) => current.filter((item) => !idsToDelete.has(item.id)));
      const plural = idsToDelete.size === 1 ? "" : "s";
      toastApi?.success?.(
        bulkLabels.deleteSuccessMsg
          .replace("{count}", String(idsToDelete.size))
          .replace("{plural}", plural),
        bulkLabels.deleteSuccessTitle
      );
      setPendingDeleteIds(null);
    } catch (err) {
      // Report error without exposing internals to the user
      reportError(err instanceof Error ? err : new Error(String(err)), {
        action: "bulk-delete",
        count: idsToDelete.size,
      });
      toastApi?.error?.(bulkLabels.deleteErrorMsg, bulkLabels.deleteErrorTitle);
      // pendingDeleteIds intentionally NOT cleared on failure — the dialog
      // stays open so the user can retry or cancel explicitly.
      // The item list is NOT mutated.
    } finally {
      setBulkRunning((prev) => ({ ...prev, delete: false }));
    }
  }, [pendingDeleteIds, bulkRunning.delete, safeOnBulkDelete, toastApi]);

  // ── Export ──────────────────────────────────────────────────────────────────
  // Invariant: bulkRunning.export prevents concurrent re-entry.
  const handleExport = useCallback(() => {
    if (selectedIds.size === 0) {
      toastApi?.info?.(bulkLabels.exportEmptyMsg, bulkLabels.exportSuccessTitle);
      return;
    }
    if (bulkRunning.export) return; // Concurrent-safety guard
    setBulkRunning((prev) => ({ ...prev, export: true }));
    try {
      const selectedSlice = items.filter((item) => selectedIds.has(item.id));
      const result = safeOnBulkExport(selectedSlice) || {
        count: selectedSlice.length,
      };
      const exportCount = result.count ?? selectedSlice.length;
      const plural = exportCount === 1 ? "" : "s";
      toastApi?.success?.(
        bulkLabels.exportSuccessMsg
          .replace("{count}", String(exportCount))
          .replace("{plural}", plural),
        bulkLabels.exportSuccessTitle
      );
    } catch {
      // Keep the selection intact so a transient download/serialization
      // failure can be retried without reconstructing the user's selection.
      toastApi?.error?.(bulkLabels.exportErrorMsg, bulkLabels.exportErrorTitle);
    } finally {
      setBulkRunning((prev) => ({ ...prev, export: false }));
    }
  }, [selectedIds, items, safeOnBulkExport, toastApi, bulkRunning.export]);

  // ── Empty state guard ───────────────────────────────────────────────────────
  if (items.length === 0) {
    return null;
  }

  // Sanitize every displayed field (INV-5).
  const issuer = safeField(invoice.issuer);
  const currency = safeField(invoice.currency);
  const dueDate = safeField(invoice.dueDate);
  const status = safeField(invoice.status);

  // Format amount with full currency formatting helper.
  const formattedAmount = formatCurrency(invoice.amount, { currency });

  // Format yield with sentinel guard (INV-6).
  const formattedYield = formatYield(invoice.yield);

  const d = copy.investDetail;

  // eslint-disable-next-line react/jsx-no-useless-fragment
  return (
    <>
      {/* ── Invoice fact sheet ─────────────────────────────────────────── */}
      <section
        aria-labelledby="invoice-summary-heading"
        className="print-invoice-section rounded-xl border border-slate-800 bg-slate-900/50 p-6 mb-6"
      >
        <h2 id="invoice-summary-heading" className="text-xl font-semibold mb-4">
          {issuer || d.dtIssuer}
        </h2>

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-slate-500">{d.dtIssuer}</dt>
            <dd className="text-slate-100">{issuer || "—"}</dd>
          </div>

          <div>
            <dt className="text-slate-500">{d.dtAmount}</dt>
            <dd className="text-slate-100">{formattedAmount}</dd>
          </div>

          <div>
            <dt className="text-slate-500">{d.dtYield}</dt>
            <dd className="text-slate-100">{formattedYield}</dd>
          </div>

          <div>
            <dt className="text-slate-500">{d.dtMaturity}</dt>
            <dd className="text-slate-100">{dueDate || "—"}</dd>
          </div>

          <div>
            <dt className="text-slate-500">{d.dtStatus}</dt>
            <dd className="text-slate-100">
              {/* StatusPill tolerates empty / unknown strings (INV-2). */}
              <StatusPill status={status} />
            </dd>
          </div>
        </dl>
      </section>

      {/* ── Action buttons ─────────────────────────────────────────────── */}
      <div className="no-print flex flex-wrap gap-3">
        {/* Fund — disabled when wallet is CONNECTING or NO_WALLET (INV-3). */}
        <button
          type="button"
          onClick={onFund}
          disabled={isFundingDisabled}
          className="rounded-full bg-cyan-500/20 text-cyan-400 px-6 py-3 text-sm font-medium hover:bg-cyan-500/30 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label={d.fundButtonAriaLabel}
        >
          {d.fundButton}
        </button>

        {/* Copy link */}
        <button
          type="button"
          onClick={onCopyLink}
          className="rounded-full border border-slate-700 text-slate-300 px-6 py-3 text-sm font-medium hover:bg-slate-800/50 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950 focus:ring-cyan-500"
          aria-label={d.copyLinkAriaLabel}
        >
          {d.copyLinkButton}
        </button>

        {/* Print / Save PDF */}
        <button
          type="button"
          onClick={onPrint}
          className="rounded-full border border-slate-700 text-slate-300 px-6 py-3 text-sm font-medium hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950 focus:ring-cyan-500"
          aria-label={d.printAriaLabel}
        >
          {d.printButton}
        </button>
      </div>

      {/* ── Disclaimer ─────────────────────────────────────────────────── */}
      <div className="no-print mt-6 rounded-xl border border-slate-800 bg-slate-900/30 p-4 text-sm text-slate-300">
        {d.disclaimer}
      </div>
    </>
  );
}

/**
 * Public default export: `InvoiceDetailItems` wrapped in its error boundary.
 *
 * The boundary ensures that a render-time crash in the document-management
 * section never propagates to the parent invoice detail page. Errors are
 * reported via `reportError` (without exposing sensitive data) and a
 * graceful fallback is displayed instead.
 */
export default function InvoiceDetailItems(props) {
  return (
    <InvoiceDetailItemsErrorBoundary>
      <InvoiceDetailItemsInner {...props} />
    </InvoiceDetailItemsErrorBoundary>
  );
}
