"use client";

import { memo, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import Button from "./Button";
import ConfirmDialog from "./ConfirmDialog";
import ErrorBanner from "./ErrorBanner";
import EmptyState, { InvoiceEmptyIllustration } from "./EmptyState";
import InvoiceListSkeleton from "./InvoiceListSkeleton";
import { useToast } from "./ToastProvider";
import { copy } from "../app/copy/en";
import { downloadInvoices } from "../lib/exportInvoices";

const INVOICE_STATUSES = {
  PENDING_TOKENIZATION: "Pending tokenization",
  TOKENIZED: "Tokenized",
  FUNDED: "Funded",
  SETTLED: "Settled",
};

const STATUS_STYLES = {
  [INVOICE_STATUSES.PENDING_TOKENIZATION]:
    "bg-amber-500/10 text-amber-200 ring-1 ring-amber-400/20",
  [INVOICE_STATUSES.TOKENIZED]: "bg-cyan-500/10 text-cyan-200 ring-1 ring-cyan-400/20",
  [INVOICE_STATUSES.FUNDED]: "bg-emerald-500/10 text-emerald-200 ring-1 ring-emerald-400/20",
  [INVOICE_STATUSES.SETTLED]: "bg-slate-800/80 text-slate-200 ring-1 ring-slate-500/20",
};

const MOCK_INVOICES = [
  {
    id: "inv-1001",
    issuer: "Test Supplier",
    amount: "12,500",
    currency: "USD",
    dueDate: "2026-06-15",
    yield: "8.2%",
    status: INVOICE_STATUSES.TOKENIZED,
  },
  {
    id: "inv-1002",
    issuer: "Another LLC",
    amount: "7,800",
    currency: "EUR",
    dueDate: "2026-07-01",
    yield: "7.5%",
    status: INVOICE_STATUSES.SETTLED,
  },
];

function loadMockInvoices() {
  return Promise.resolve(MOCK_INVOICES);
}

/**
 * Writes `text` to the clipboard. Falls back to the legacy execCommand API
 * for browsers that do not expose navigator.clipboard.
 * @param {string} text
 */
async function copyToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  // execCommand fallback for environments without the Clipboard API.
  const el = document.createElement("textarea");
  el.value = text;
  el.setAttribute("readonly", "");
  el.style.cssText = "position:fixed;left:-9999px;top:-9999px";
  document.body.appendChild(el);
  el.select();
  document.execCommand("copy");
  document.body.removeChild(el);
}

/**
 * UploadIdCopyButton
 *
 * Renders the upload identifier as monospace text with an adjacent copy
 * button. Clicking copies the id via the Clipboard API (with execCommand
 * fallback) and shows a success or error toast.
 *
 * @param {{ id: string }} props
 */
function UploadIdCopyButton({ id }) {
  const toast = useToast();
  const [copying, setCopying] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  const handleCopy = useCallback(async () => {
    if (copying) return;
    setCopying(true);
    try {
      await copyToClipboard(id);
      toast.success(copy.invoices.copyIdSuccessMsg, copy.invoices.copyIdSuccessTitle);
    } catch {
      toast.error(copy.invoices.copyIdErrorMsg, copy.invoices.copyIdErrorTitle);
    } finally {
      timerRef.current = setTimeout(() => setCopying(false), 1500);
    }
  }, [id, copying, toast]);

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span
        className="font-mono text-xs text-slate-300 break-all"
        title={id}
        aria-label={`Upload identifier: ${id}`}
      >
        {id}
      </span>
      <button
        type="button"
        onClick={handleCopy}
        aria-label={copy.invoices.copyIdAriaLabel.replace("{id}", id)}
        title={copying ? "Copied!" : copy.invoices.copyIdButton}
        className="inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded text-slate-500 hover:text-slate-300 focus-ring transition-colors"
      >
        {copying ? (
          <svg
            aria-hidden="true"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg
            aria-hidden="true"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        )}
        <span className="sr-only">{copying ? "Copied!" : copy.invoices.copyIdButton}</span>
      </button>
    </div>
  );
}

function getInvoiceAnnouncement(items) {
  if (!Array.isArray(items)) {
    return "";
  }

  if (items.length === 0) {
    return "No invoices are currently available.";
  }

  return `${items.length} invoice${items.length === 1 ? "" : "s"} available.`;
}

function mergeInvoices(optimisticInvoices, loadedInvoices) {
  const mergedById = new Map();

  (optimisticInvoices ?? []).forEach((invoice) => {
    mergedById.set(invoice.id, invoice);
  });

  (loadedInvoices ?? []).forEach((invoice) => {
    if (!mergedById.has(invoice.id)) {
      mergedById.set(invoice.id, invoice);
    }
  });

  return Array.from(mergedById.values());
}

/**
 * Given a number of days until (-) or since (+) maturity, return the
 * appropriate badge label and styling class.
 * @param {number} days - Days until maturity (negative = overdue, 0 = today, positive = future)
 * @returns {{ label: string, className: string }}
 */
export function getMaturityBadgeProps(days) {
  if (days < 0) {
    const abs = Math.abs(days);
    return {
      label: `Overdue by ${abs} day${abs === 1 ? "" : "s"}`,
      className: "bg-red-500/10 text-red-200 ring-1 ring-red-400/20",
    };
  }
  if (days === 0) {
    return {
      label: "Matures today",
      className: "bg-yellow-500/10 text-yellow-200 ring-1 ring-yellow-400/20",
    };
  }
  return {
    label: `Matures in ${days} day${days === 1 ? "" : "s"}`,
    className: "bg-slate-500/10 text-slate-200 ring-1 ring-slate-400/20",
  };
}

/**
 * A single invoice row. Memoized so that unrelated re-renders of the parent
 * InvoiceList (e.g. loading/error state changes, or a sibling invoice's data
 * changing) do not force every row to re-render — only a row whose own
 * `invoice` prop actually changed re-renders.
 */
export const InvoiceListItem = memo(function InvoiceListItem({ invoice }) {
  const statusValue =
    invoice.status in STATUS_STYLES ? invoice.status : INVOICE_STATUSES.PENDING_TOKENIZATION;

  return (
    <li className="rounded-3xl border border-slate-800 bg-slate-900/50 p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.14em] text-slate-500">Invoice</p>
          <p className="mt-2 text-lg font-semibold text-slate-100">{invoice.issuer}</p>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
            STATUS_STYLES[statusValue]
          }`}
        >
          {statusValue}
        </span>
      </div>

      <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="text-xs uppercase tracking-[0.24em] text-slate-500">Amount</dt>
          <dd className="mt-2 text-sm text-slate-200">
            {invoice.currency} {invoice.amount}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-[0.24em] text-slate-500">Estimated yield</dt>
          <dd className="mt-2 text-sm text-slate-200">{invoice.yield}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-[0.24em] text-slate-500">Due date</dt>
          <dd className="mt-2 text-sm text-slate-200">{invoice.dueDate}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-[0.24em] text-slate-500">Reference</dt>
          <dd className="mt-2 text-sm text-slate-200">
            <UploadIdCopyButton id={invoice.id} />
          </dd>
        </div>
      </dl>
    </li>
  );
});

export default function InvoiceList({ loadInvoices = loadMockInvoices, optimisticInvoices = [] }) {
  const [invoices, setInvoices] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const toast = useToast();

  const mergedInvoices = useMemo(
    () => mergeInvoices(optimisticInvoices, invoices ?? []),
    [optimisticInvoices, invoices]
  );
  const handleExport = useCallback(
    (format) => downloadInvoices(mergedInvoices, format),
    [mergedInvoices]
  );

  const allSelected =
    mergedInvoices.length > 0 && mergedInvoices.every((inv) => selectedIds.has(inv.id));
  const someSelected = selectedIds.size > 0;
  const isIndeterminate = someSelected && !allSelected;
  const selectionCount = selectedIds.size;

  const statusMessage = useMemo(() => {
    if (loadError) return loadError;
    if (invoices === null) return "Loading invoices...";
    return getInvoiceAnnouncement(mergedInvoices);
  }, [invoices, mergedInvoices, loadError]);

  const selectAllRef = useRef(null);
  const headerCheckboxId = useId();

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = isIndeterminate;
    }
  }, [isIndeterminate]);

  const handleSelectInvoice = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.size === mergedInvoices.length && mergedInvoices.length > 0) return new Set();
      return new Set(mergedInvoices.map((inv) => inv.id));
    });
  }, [mergedInvoices]);

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleRequestDelete = useCallback(() => {
    setConfirmingDelete(true);
  }, []);

  const handleCancelDelete = useCallback(() => {
    setConfirmingDelete(false);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    const idsToDelete = Array.from(selectedIds);
    setInvoices((prev) => (prev ? prev.filter((inv) => !idsToDelete.includes(inv.id)) : prev));
    setSelectedIds(new Set());
    setConfirmingDelete(false);
    const msg = `Deleted ${idsToDelete.length} invoice${idsToDelete.length !== 1 ? "s" : ""}.`;
    setAnnouncement(msg);
    toast.success(msg);
  }, [selectedIds, toast]);

  useEffect(() => {
    let active = true;

    async function load() {
      setInvoices(null);
      setLoadError("");
      setSelectedIds(new Set());
      setAnnouncement("");

      try {
        const result = await loadInvoices();
        if (!active) return;

        const normalized = Array.isArray(result) ? result : [];
        setInvoices(normalized);
      } catch {
        if (!active) return;

        setLoadError(copy.invoices.errorDescription || "Unable to load invoices.");
        setInvoices([]);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [loadInvoices]);

  const handleStartEdit = (invoice) => {
    setEditingId(invoice.id);
    setEditForm({
      issuer: invoice.issuer ?? "",
      amount: invoice.amount ?? "",
      currency: invoice.currency ?? "",
      dueDate: invoice.dueDate ?? "",
      yield: invoice.yield ?? "",
    });
    setValidationError(null);
    const msg =
      copy.invoices.announceEditStarted?.replace("{id}", invoice.id) ||
      `Editing invoice ${invoice.id}.`;
    setAnnouncement(msg);
  };

  const handleCancelEdit = (id) => {
    const targetId = id || editingId;
    setEditingId(null);
    setValidationError(null);
    const msg =
      copy.invoices.announceEditCancelled?.replace("{id}", targetId) ||
      `Editing cancelled for invoice ${targetId}.`;
    setAnnouncement(msg);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
    if (validationError) {
      setValidationError(null);
    }
  };

  const handleSaveEdit = (e, invoice) => {
    e.preventDefault();
    const issuer = editForm.issuer.trim();
    const amount = editForm.amount.trim();
    const currency = editForm.currency.trim();
    const dueDate = editForm.dueDate.trim();
    const yieldVal = editForm.yield.trim();

    if (!issuer) {
      const err = copy.invoices.errorIssuerRequired || "Issuer name is required.";
      setValidationError(err);
      setAnnouncement(err);
      return;
    }
    if (!amount) {
      const err = copy.invoices.errorAmountRequired || "Amount is required and must be valid.";
      setValidationError(err);
      setAnnouncement(err);
      return;
    }
    if (!currency) {
      const err = copy.invoices.errorCurrencyRequired || "Currency is required.";
      setValidationError(err);
      setAnnouncement(err);
      return;
    }
    if (!dueDate) {
      const err = copy.invoices.errorDueDateRequired || "Due date is required.";
      setValidationError(err);
      setAnnouncement(err);
      return;
    }

    const updated = {
      ...invoice,
      issuer,
      amount,
      currency,
      dueDate,
      yield: yieldVal,
    };

    setEditedInvoices((prev) => ({ ...prev, [invoice.id]: updated }));
    if (typeof onUpdateInvoice === "function") {
      onUpdateInvoice(updated);
    }

    setEditingId(null);
    setValidationError(null);
    const msg =
      copy.invoices.announceEditSuccess?.replace("{id}", invoice.id) ||
      `Invoice ${invoice.id} updated successfully.`;
    setAnnouncement(msg);
  };

  const handleKeyDown = (e, id) => {
    if (e.key === "Escape") {
      e.preventDefault();
      handleCancelEdit(id);
    }
  };

  if (loadError) {
    return (
      <div className="space-y-6">
        <ErrorBanner
          title={copy.invoices.errorTitle || "Unable to load invoices"}
          description={loadError}
          previewLabel="Invoice list status"
        />
        <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
          {announcement || statusMessage}
        </p>
      </div>
    );
  }

  return (
    <section aria-labelledby="invoice-list-heading" className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {invoices !== null && mergedInvoices.length > 0 && (
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-400">
              <input
                ref={selectAllRef}
                type="checkbox"
                id={headerCheckboxId}
                checked={allSelected}
                onChange={handleSelectAll}
                aria-label={allSelected ? "Deselect all invoices" : "Select all invoices"}
                className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-cyan-500 focus-ring"
              />
              <span className="sr-only">Select all</span>
            </label>
          )}
          <div>
            <h2 id="invoice-list-heading" className="text-xl font-semibold text-slate-100">
              Your invoices
            </h2>
            <p className="text-sm text-slate-400">
              Track tokenization progress for uploaded documents.
            </p>
          </div>
        </div>
        {invoices !== null && mergedInvoices.length > 0 && (
          <div className="flex items-center gap-2" role="group" aria-label="Export invoices">
            <Button variant="secondary" onClick={() => handleExport("csv")}>
              Export CSV
            </Button>
            <Button variant="secondary" onClick={() => handleExport("json")}>
              Export JSON
            </Button>
          </div>
        )}
        <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
          {announcement || statusMessage}
        </p>
      </div>

      {someSelected && (
        <div
          role="toolbar"
          aria-label="Bulk actions"
          className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-700/50 bg-slate-800/50 px-4 py-3"
        >
          <span className="text-sm font-medium text-slate-300">{selectionCount} selected</span>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button variant="danger" onClick={handleRequestDelete}>
              Delete selected
            </Button>
            <Button variant="secondary" onClick={handleClearSelection}>
              Clear selection
            </Button>
          </div>
        </div>
      )}

      {invoices === null && mergedInvoices.length === 0 ? (
        <InvoiceListSkeleton rows={3} />
      ) : mergedInvoices.length === 0 ? (
        <EmptyState
          icon={<InvoiceEmptyIllustration />}
          title="No invoices yet"
          description="Upload your first invoice to get started. It will appear here once tokenized."
          action={
            <a
              href="#invoice-upload-btn"
              className="inline-flex items-center gap-2 rounded-xl border border-cyan-700 bg-cyan-900/30 px-5 py-2.5 text-sm font-semibold text-cyan-300 transition-colors hover:bg-cyan-800/40 focus-ring"
            >
              Upload your first invoice
            </a>
          }
        />
      ) : (
        <ul className="space-y-4">
          {mergedInvoices.map((invoice) => {
            const statusValue =
              invoice.status in STATUS_STYLES
                ? invoice.status
                : INVOICE_STATUSES.PENDING_TOKENIZATION;
            const isEditing = editingId === invoice.id;

            if (isEditing) {
              return (
                <li
                  key={invoice.id}
                  className="rounded-3xl border border-cyan-500/50 bg-slate-900/80 p-5 shadow-md transition-all"
                >
                  <form
                    onSubmit={(e) => handleSaveEdit(e, invoice)}
                    onKeyDown={(e) => handleKeyDown(e, invoice.id)}
                    aria-label={`Edit invoice ${invoice.id}`}
                    noValidate
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex-1">
                        <label
                          htmlFor={`edit-issuer-${invoice.id}`}
                          className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400 block mb-1"
                        >
                          {copy.invoices.issuerLabel || "Issuer"}
                        </label>
                        <input
                          id={`edit-issuer-${invoice.id}`}
                          type="text"
                          name="issuer"
                          value={editForm.issuer}
                          onChange={handleEditChange}
                          autoFocus
                          aria-label="Issuer"
                          className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-base font-semibold text-slate-100 focus-ring"
                        />
                      </div>
                      <div className="flex items-center gap-2 pt-2 sm:pt-0">
                        <button
                          type="submit"
                          aria-label={
                            copy.invoices.saveEditAriaLabel?.replace("{id}", invoice.id) ||
                            `Save edits for invoice ${invoice.id}`
                          }
                          className="rounded-xl bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950 transition-all hover:bg-cyan-400 focus-ring"
                        >
                          {copy.invoices.saveEditAction || "Save"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCancelEdit(invoice.id)}
                          aria-label={
                            copy.invoices.cancelEditAriaLabel?.replace("{id}", invoice.id) ||
                            `Cancel editing invoice ${invoice.id}`
                          }
                          className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 transition-all hover:bg-slate-700 focus-ring"
                        >
                          {copy.invoices.cancelEditAction || "Cancel"}
                        </button>
                      </div>
                    </div>

                    <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <label
                          htmlFor={`edit-amount-${invoice.id}`}
                          className="text-xs uppercase tracking-[0.24em] text-slate-400 block mb-1"
                        >
                          {copy.invoices.amountLabel || "Amount"}
                        </label>
                        <div className="flex gap-2">
                          <input
                            id={`edit-currency-${invoice.id}`}
                            type="text"
                            name="currency"
                            value={editForm.currency}
                            onChange={handleEditChange}
                            aria-label="Currency"
                            className="w-20 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-sm text-slate-200 focus-ring"
                          />
                          <input
                            id={`edit-amount-${invoice.id}`}
                            type="text"
                            name="amount"
                            value={editForm.amount}
                            onChange={handleEditChange}
                            aria-label="Amount"
                            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-sm text-slate-200 focus-ring"
                          />
                        </div>
                      </div>
                      <div>
                        <label
                          htmlFor={`edit-yield-${invoice.id}`}
                          className="text-xs uppercase tracking-[0.24em] text-slate-400 block mb-1"
                        >
                          {copy.invoices.yieldLabel || "Estimated yield"}
                        </label>
                        <input
                          id={`edit-yield-${invoice.id}`}
                          type="text"
                          name="yield"
                          value={editForm.yield}
                          onChange={handleEditChange}
                          aria-label="Estimated yield"
                          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-sm text-slate-200 focus-ring"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor={`edit-dueDate-${invoice.id}`}
                          className="text-xs uppercase tracking-[0.24em] text-slate-400 block mb-1"
                        >
                          {copy.invoices.dueDateLabel || "Due date"}
                        </label>
                        <input
                          id={`edit-dueDate-${invoice.id}`}
                          type="text"
                          name="dueDate"
                          value={editForm.dueDate}
                          onChange={handleEditChange}
                          aria-label="Due date"
                          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-sm text-slate-200 focus-ring"
                        />
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-[0.24em] text-slate-500">
                          Reference
                        </dt>
                        <dd className="mt-2 text-sm text-slate-400">{invoice.id}</dd>
                      </div>
                    </dl>

                    {validationError && (
                      <p
                        role="alert"
                        className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-400"
                      >
                        ⚠️ {validationError}
                      </p>
                    )}
                  </form>
                </li>
              );
            }

            return (
              <li
                key={invoice.id}
                className="rounded-3xl border border-slate-800 bg-slate-900/50 p-5 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1.5">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(invoice.id)}
                      onChange={() => handleSelectInvoice(invoice.id)}
                      aria-label={`Select invoice ${invoice.id} from ${invoice.issuer}`}
                      className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-cyan-500 focus-ring"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-medium uppercase tracking-[0.14em] text-slate-500">
                          Invoice
                        </p>
                        <p className="mt-2 text-lg font-semibold text-slate-100">
                          {invoice.issuer}
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
                          STATUS_STYLES[statusValue]
                        }`}
                      >
                        {statusValue}
                      </span>
                    </div>

                    <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <dt className="text-xs uppercase tracking-[0.24em] text-slate-500">
                          Amount
                        </dt>
                        <dd className="mt-2 text-sm text-slate-200">
                          {invoice.currency} {invoice.amount}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-[0.24em] text-slate-500">
                          Estimated yield
                        </dt>
                        <dd className="mt-2 text-sm text-slate-200">{invoice.yield}</dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-[0.24em] text-slate-500">
                          Due date
                        </dt>
                        <dd className="mt-2 text-sm text-slate-200">{invoice.dueDate}</dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-[0.24em] text-slate-500">
                          Reference
                        </dt>
                        <dd className="mt-2 text-sm text-slate-200">
                          <UploadIdCopyButton id={invoice.id} />
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={confirmingDelete}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        title={`Delete ${selectionCount} invoice${selectionCount !== 1 ? "s" : ""}?`}
        message={`Are you sure you want to delete ${selectionCount} selected invoice${selectionCount !== 1 ? "s" : ""}? This action cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="danger"
      />

      <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </p>
    </section>
  );
}
