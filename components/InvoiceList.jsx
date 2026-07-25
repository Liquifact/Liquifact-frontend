"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import Button from "./Button";
import ConfirmDialog from "./ConfirmDialog";
import ErrorBanner from "./ErrorBanner";
import EmptyState, { InvoiceEmptyIllustration } from "./EmptyState";
import InvoiceListSkeleton from "./InvoiceListSkeleton";
import { useToast } from "./ToastProvider";
import { copy } from "../app/copy/en";

const INVOICE_STATUSES = {
  PENDING_TOKENIZATION: "Pending tokenization",
  TOKENIZED: "Tokenized",
  FUNDED: "Funded",
  SETTLED: "Settled",
};

const user = {
  name: "boss",
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

async function copyToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  // Guarded execCommand fallback for browsers without the Clipboard API.
  const el = document.createElement("textarea");
  el.value = text;
  el.setAttribute("readonly", "");
  el.style.cssText = "position:fixed;left:-9999px;top:-9999px";
  document.body.appendChild(el);
  el.select();
  document.execCommand("copy");
  document.body.removeChild(el);
}

function AddressCopyButton({ address }) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  const handleCopy = async () => {
    try {
      await copyToClipboard(address);
      setCopied(true);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Copy blocked by browser — fail silently, no error surface.
    }
  };

  const display = truncateAddress(address);

  return (
    <div className="mt-1 flex items-center gap-1.5">
      <span
        className="font-mono text-xs text-slate-400"
        title={address}
        aria-label={`Issuer address: ${address}`}
      >
        {display}
      </span>
      <button
        type="button"
        onClick={handleCopy}
        aria-label={copied ? "Copied!" : `Copy issuer address ${display}`}
        title={copied ? "Copied!" : "Copy issuer address"}
        className="inline-flex h-5 w-5 items-center justify-center rounded text-slate-500 hover:text-slate-300 focus-ring transition-colors"
      >
        {copied ? (
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
        <span className="sr-only">{copied ? "Copied!" : "Copy"}</span>
      </button>
      {copied && (
        <span role="status" aria-live="polite" className="text-xs text-emerald-400">
          Copied!
        </span>
      )}
    </div>
  );
}

function loadMockInvoices() {
  return Promise.resolve(MOCK_INVOICES);
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
      } catch (error) {
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

  // Compute status message inline in render

  if (loadError) {
    return (
      <div className="space-y-6">
        <ErrorBanner
          title={copy.invoices.errorTitle || "Unable to load invoices"}
          description={loadError}
          previewLabel="Invoice list status"
        />
        <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
          {statusMessage}
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
        <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
          {statusMessage}
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
                        <dd className="mt-2 text-sm text-slate-200">{invoice.id}</dd>
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
