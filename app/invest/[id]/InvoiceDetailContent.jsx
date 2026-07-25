/**
 * @file app/invest/[id]/InvoiceDetailContent.jsx
 *
 * Client component for the invoice detail page that manages data fetching state.
 *
 * Follows the same fetch-state model as InvoiceList:
 *   - data = null          → loading (shows skeleton)
 *   - loadError = string   → error (shows ErrorBanner with retry)
 *   - data = undefined     → empty (shows EmptyState)
 *   - data = object        → success (renders invoice detail)
 *
 * The retry button is keyboard-operable (native <button>).
 * State changes are announced via aria-live regions for assistive tech.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { copy } from "@/app/copy/en";
import { getInvoiceById } from "../lib";
import InvoiceDetailData from "./InvoiceDetailData";
import InvoiceDetailSkeleton from "./InvoiceDetailSkeleton";
import ErrorBanner from "@/components/ErrorBanner";
import EmptyState, { InvoiceEmptyIllustration } from "@/components/EmptyState";

const detail = copy.invest.detail;

/**
 * Default async loader that wraps the sync getInvoiceById in a Promise.
 * In production, this would be replaced with a real API call.
 *
 * @param {string} id - Invoice identifier
 * @returns {Promise<object|null|undefined>} Invoice object, null (not found), or undefined (empty)
 */
async function defaultLoadInvoice(id) {
  // Simulate network delay in development to make loading visible
  const DEV_DELAY = process.env.NODE_ENV === "development" ? 800 : 0;
  if (DEV_DELAY) {
    await new Promise((resolve) => setTimeout(resolve, DEV_DELAY));
  }
  return getInvoiceById(id);
}

/**
 * @param {object} props
 * @param {string} props.id - Invoice identifier from dynamic route
 * @param {Function} [props.loadInvoice=defaultLoadInvoice] - Injectable async loader
 *   Returns Promise resolving to invoice object, null (not found), or undefined (empty)
 */
export default function InvoiceDetailContent({ id, loadInvoice = defaultLoadInvoice }) {
  const [data, setData] = useState(null); // null = loading, object = data, undefined = empty
  const [loadError, setLoadError] = useState("");
  const [isRetrying, setIsRetrying] = useState(false);

  const detailCopy = copy.invest.detail;

  // Status message for screen readers
  const statusMessage = useCallback(() => {
    if (loadError) return detailCopy.announceError;
    if (data === null) return detailCopy.announceLoading;
    if (data === undefined) return detailCopy.announceEmpty;
    return "";
  }, [data, loadError, detailCopy]);

  const fetchInvoice = useCallback(async () => {
    setData(null); // loading
    setLoadError("");

    try {
      const result = await loadInvoice(id);
      if (!result) {
        // null = not found, undefined = empty
        setData(result);
      } else {
        setData(result);
      }
    } catch (error) {
      setLoadError(detailCopy.loadErrorMsg);
      setData(undefined);
    }
  }, [id, loadInvoice, detailCopy.loadErrorMsg]);

  const handleRetry = useCallback(() => {
    setIsRetrying(true);
    fetchInvoice();
    // Reset retrying state after fetch initiates
    setTimeout(() => setIsRetrying(false), 0);
  }, [fetchInvoice]);

  // Initial fetch on mount
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchInvoice();
  }, [fetchInvoice]);

  // Loading state
  if (data === null) {
    return (
      <div aria-busy="true" aria-live="polite" aria-atomic="true">
        <InvoiceDetailSkeleton />
        <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {detailCopy.announceLoading}
        </p>
      </div>
    );
  }

  // Error state
  if (loadError) {
    return (
      <div className="space-y-6">
        <ErrorBanner
          title={detailCopy.loadErrorTitle}
          description={loadError}
          actionLabel={detailCopy.retryLabel}
          onAction={handleRetry}
          previewLabel="Invoice detail status"
        />
        <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
          {detailCopy.announceError}
        </p>
      </div>
    );
  }

  // Empty state (no invoice found for this ID)
  if (data === undefined) {
    return (
      <div className="space-y-6">
        <EmptyState
          icon={<InvoiceEmptyIllustration />}
          title={detailCopy.emptyStateTitle}
          description={detailCopy.emptyStateDescription}
          action={
            <Link
              href="/invest"
              className="inline-flex items-center gap-2 rounded-xl border border-cyan-700 bg-cyan-900/30 px-5 py-2.5 text-sm font-semibold text-cyan-300 transition-colors hover:bg-cyan-800/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
            >
              {detailCopy.backToMarketplace}
            </Link>
          }
        />
        <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
          {detailCopy.announceEmpty}
        </p>
      </div>
    );
  }

  // Success state - render the invoice detail data
  return <InvoiceDetailData invoice={data} />;
}