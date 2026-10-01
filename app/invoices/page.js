"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { copy } from "../copy/en";
import NavMenu from "../../components/NavMenu";
import UploadZone from "../../components/UploadZone";
import UploadErrorBoundary from "../../components/UploadErrorBoundary";
import InvoiceList from "../../components/InvoiceList";
import { reportError } from "../../lib/observability/reportError";

/** Channel name used for multi-tab optimistic invoice synchronization */
export const INVOICES_SYNC_CHANNEL = "liquifact-invoices-sync";

/**
 * Normalizes an invoice object to ensure contract conformance.
 * Enforces field types, defaults missing attributes, and guarantees
 * a non-empty unique identifier without mutating input.
 *
 * @param {unknown} invoice - The raw invoice payload
 * @param {number} [fallbackSequence=0] - Fallback sequence number for tie-breaking
 * @returns {object | null} The normalized invoice, or null if input is fundamentally invalid
 */
export function normalizeInvoice(invoice, fallbackSequence = 0) {
  if (!invoice || typeof invoice !== "object") {
    return null;
  }

  const rawId = typeof invoice.id === "string" ? invoice.id.trim() : "";
  const id =
    rawId ||
    `inv-opt-${Date.now()}-${fallbackSequence}-${Math.random().toString(36).slice(2, 7)}`;

  const issuer =
    typeof invoice.issuer === "string" && invoice.issuer.trim()
      ? invoice.issuer.trim()
      : "Unknown Issuer";

  const amount =
    typeof invoice.amount === "string" || typeof invoice.amount === "number"
      ? String(invoice.amount)
      : "Pending";

  const currency =
    typeof invoice.currency === "string" && invoice.currency.trim()
      ? invoice.currency.trim()
      : "USD";

  const dueDate =
    typeof invoice.dueDate === "string" && invoice.dueDate.trim()
      ? invoice.dueDate.trim()
      : "Pending";

  const yieldValue =
    typeof invoice.yield === "string" && invoice.yield.trim()
      ? invoice.yield.trim()
      : "Pending";

  const status =
    typeof invoice.status === "string" && invoice.status.trim()
      ? invoice.status.trim()
      : "Pending tokenization";

  const timestamp =
    typeof invoice._timestamp === "number" && !Number.isNaN(invoice._timestamp)
      ? invoice._timestamp
      : Date.now();

  return {
    ...invoice,
    id,
    issuer,
    amount,
    currency,
    dueDate,
    yield: yieldValue,
    status,
    _timestamp: timestamp,
  };
}

/**
 * Merges an incoming invoice into the current list deterministically.
 *
 * Invariants enforced:
 * 1. State array never contains duplicate IDs.
 * 2. If an invoice with the same ID exists:
 *    - Updates in-place with latest attributes if incoming is newer or equal in timestamp.
 *    - Discards out-of-order stale updates (incoming._timestamp < existing._timestamp).
 *    - Returns existing array identity if incoming is an identical no-op.
 * 3. If the invoice ID is new, prepends it to the beginning of the list.
 *
 * @param {Array<object>} currentInvoices - Existing optimistic invoices
 * @param {object} incomingInvoice - Normalized invoice to merge
 * @returns {Array<object>} New array of invoices, or existing if unmodified
 */
export function deduplicateAndMergeInvoices(currentInvoices, incomingInvoice) {
  if (!incomingInvoice || typeof incomingInvoice !== "object" || !incomingInvoice.id) {
    return currentInvoices;
  }

  const existingIndex = currentInvoices.findIndex((inv) => inv?.id === incomingInvoice.id);

  if (existingIndex === -1) {
    // New invoice: prepend to maintain latest-first order
    return [incomingInvoice, ...currentInvoices];
  }

  const existing = currentInvoices[existingIndex];

  // Concurrency guard: reject out-of-order stale updates
  if (
    typeof existing?._timestamp === "number" &&
    typeof incomingInvoice._timestamp === "number" &&
    incomingInvoice._timestamp < existing._timestamp
  ) {
    return currentInvoices;
  }

  // Idempotency check: if all public fields are equal, avoid unnecessary array allocation
  if (
    existing.issuer === incomingInvoice.issuer &&
    existing.amount === incomingInvoice.amount &&
    existing.currency === incomingInvoice.currency &&
    existing.dueDate === incomingInvoice.dueDate &&
    existing.yield === incomingInvoice.yield &&
    existing.status === incomingInvoice.status
  ) {
    return currentInvoices;
  }

  // Update in place preserving stable position
  const next = [...currentInvoices];
  next[existingIndex] = {
    ...existing,
    ...incomingInvoice,
    _timestamp: incomingInvoice._timestamp || Date.now(),
  };
  return next;
}

/**
 * Normalizes and deduplicates initial invoice seeds.
 *
 * @param {Array<unknown>} initialInvoices
 * @returns {Array<object>}
 */
function getInitialNormalizedInvoices(initialInvoices) {
  if (!Array.isArray(initialInvoices)) {
    return [];
  }
  const seenIds = new Set();
  const normalizedList = [];

  for (let i = 0; i < initialInvoices.length; i++) {
    const normalized = normalizeInvoice(initialInvoices[i], i);
    if (normalized && !seenIds.has(normalized.id)) {
      seenIds.add(normalized.id);
      normalizedList.push(normalized);
    }
  }

  return normalizedList;
}

/**
 * InvoicesPage
 *
 * Hardened invoices management page with:
 * - Deterministic compatibility contracts across valid, invalid, and boundary inputs.
 * - Concurrency hardening against rapid uploads, double-submissions, and out-of-order race conditions.
 * - Optional cross-tab synchronization via BroadcastChannel.
 * - Isolated error boundaries to prevent cascaded unrecoverable UI crashes.
 *
 * @param {object} [props]
 * @param {Array<object>} [props.initialInvoices] - Initial optimistic invoices
 * @param {Function} [props.loadInvoices] - Custom invoice loader forwarded to InvoiceList
 * @param {Function} [props.onUploadSuccess] - Callback when an upload succeeds and is normalized
 * @param {Function} [props.onUploadError] - Callback when an upload fails or payload is rejected
 * @param {boolean} [props.enableCrossTabSync=true] - Toggle cross-tab synchronization
 * @param {string} [props.className=""] - Optional wrapper CSS class
 */
export default function InvoicesPage({
  initialInvoices = [],
  loadInvoices,
  onUploadSuccess,
  onUploadError,
  enableCrossTabSync = true,
  className = "",
  ...restProps
} = {}) {
  const [optimisticInvoices, setOptimisticInvoices] = useState(() =>
    getInitialNormalizedInvoices(initialInvoices)
  );

  const isMountedRef = useRef(true);
  const tabIdRef = useRef(
    `tab-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  );
  const recentSubmissionsRef = useRef(new Map());
  const channelRef = useRef(null);

  // Sync initialInvoices if parent updates them
  const initialInvoicesRef = useRef(initialInvoices);
  useEffect(() => {
    if (initialInvoices !== initialInvoicesRef.current) {
      initialInvoicesRef.current = initialInvoices;
      if (Array.isArray(initialInvoices)) {
        setOptimisticInvoices(getInitialNormalizedInvoices(initialInvoices));
      }
    }
  }, [initialInvoices]);

  // Cross-tab synchronization via BroadcastChannel
  useEffect(() => {
    isMountedRef.current = true;

    if (!enableCrossTabSync || typeof BroadcastChannel === "undefined") {
      return () => {
        isMountedRef.current = false;
      };
    }

    let channel = null;
    try {
      channel = new BroadcastChannel(INVOICES_SYNC_CHANNEL);
      channelRef.current = channel;

      channel.onmessage = (event) => {
        if (!isMountedRef.current) return;
        const data = event?.data;
        if (!data || data.tabId === tabIdRef.current) return;

        if (data.type === "INVOICE_ADDED" && data.invoice) {
          const remoteNormalized = normalizeInvoice(data.invoice);
          if (remoteNormalized) {
            setOptimisticInvoices((current) =>
              deduplicateAndMergeInvoices(current, remoteNormalized)
            );
          }
        }
      };
    } catch {
      channel = null;
      channelRef.current = null;
    }

    return () => {
      isMountedRef.current = false;
      if (channel) {
        try {
          channel.close();
        } catch {
          // Gracefully ignore close errors
        }
        channelRef.current = null;
      }
    };
  }, [enableCrossTabSync]);

  const handleUploadSuccess = useCallback(
    (rawInvoice) => {
      if (!isMountedRef.current) return;

      const normalized = normalizeInvoice(rawInvoice);
      if (!normalized) {
        reportError(new Error("Invalid invoice payload provided to handleUploadSuccess"), {
          component: "InvoicesPage",
          action: "handleUploadSuccess",
          type: typeof rawInvoice,
        });
        if (typeof onUploadError === "function") {
          onUploadError(new Error("Invalid invoice payload provided"));
        }
        return;
      }

      // Concurrency guard: debounce rapid identical triggers within window (e.g. 300ms)
      const now = Date.now();
      const lastSeen = recentSubmissionsRef.current.get(normalized.id);
      if (lastSeen && now - lastSeen < 300) {
        return;
      }
      recentSubmissionsRef.current.set(normalized.id, now);

      // Clean up old entries from the debounce map
      if (recentSubmissionsRef.current.size > 100) {
        for (const [id, ts] of recentSubmissionsRef.current.entries()) {
          if (now - ts > 10000) recentSubmissionsRef.current.delete(id);
        }
      }

      // Deterministic state update
      setOptimisticInvoices((current) => deduplicateAndMergeInvoices(current, normalized));

      // Broadcast across tabs if enabled
      if (enableCrossTabSync && channelRef.current) {
        try {
          channelRef.current.postMessage({
            type: "INVOICE_ADDED",
            tabId: tabIdRef.current,
            invoice: normalized,
            timestamp: now,
          });
        } catch {
          // Gracefully ignore BroadcastChannel post errors
        }
      }

      // Notify caller if callback provided
      if (typeof onUploadSuccess === "function") {
        try {
          onUploadSuccess(normalized);
        } catch (callbackErr) {
          reportError(callbackErr, {
            component: "InvoicesPage",
            action: "onUploadSuccessCallback",
          });
        }
      }
    },
    [enableCrossTabSync, onUploadError, onUploadSuccess]
  );

  return (
    <div className={`min-h-screen bg-slate-950 text-slate-50 ${className}`.trim()} {...restProps}>
      <NavMenu />

      <main className="mx-auto max-w-7xl px-4 py-10 sm$px-6 lg:px-8">
        <div className="space-y-2 mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-slate-100 sm:text-4xl">
            {copy?.invoices?.title || "Invoices"}
          </h1>
          <p className="text-lg text-slate-400">
            {copy?.invoices?.description ||
              copy?.invoices?.subtext ||
              "Upload and tokenize your commercial invoices."}
          </p>
        </div>

        <div className="grid gap-10 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <UploadErrorBoundary>
              <UploadZone
                generateId={generateId}
                onUploadStart={handleUploadStart}
                onUploadSuccess={handleUploadSuccess}
                onUploadError={handleUploadError}
              />
            </UploadErrorBoundary>
            {invoiceError ? (
              <p
                role="alert"
                className="mt-4 rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
              >
                {invoiceError}
              </p>
            ) : null}
          </div>
          <div className="lg:col-span-2">
            <UploadErrorBoundary>
              <InvoiceList
                loadInvoices={loadInvoices}
                optimisticInvoices={optimisticInvoices}
              />
            </UploadErrorBoundary>
          </div>
        </div>
      </main>
    </div>
  );
}

export { InvoicesPage };
