import React, { useState, useEffect } from "react";
import StatusPill from "./StatusPill";
import ErrorBanner from "./ErrorBanner";
import Button from "./Button";
import CopyButton from "./CopyButton";
import { formatCurrency, formatPercent } from "../lib/format/currency";
import { formatInvoiceDate as formatDate } from "../lib/format/date";
import { copy } from "@/app/copy/en";
import { useFormAnnouncer } from "@/lib/hooks/useFormAnnouncer";

/**
 * InvoiceDetail
 * -------------
 * A presentational component that renders the full details of an invoice.
 * It manages its own loading/error state via an injectable `loadInvoice` prop.
 *
 * Requirements:
 * 1. Must handle loading states (spinner/skeleton).
 * 2. Must handle error states with a retry mechanism and an ErrorBanner.
 * 3. Must render all semantic fields (issuer, amount, currency, yield, maturity, status).
 * 4. Must support accessibility (aria-live for announcements, alt text, focus).
 */
export default function InvoiceDetail({
  id,
  loadInvoice, // Promise-returning function: (id: string) => Promise<Invoice>
}) {
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [announcement, announce] = useFormAnnouncer(300);

  const fetchInvoice = async (isRetry = false) => {
    try {
      if (isRetry) setIsRetrying(true);
      else setLoading(true);
      setError(null);

      const data = await loadInvoice(id);
      setInvoice(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load invoice"));
    } finally {
      setLoading(false);
      setIsRetrying(false);
    }
  };

  useEffect(() => {
    // Load invoice whenever the route id changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async load triggers setState by design
    fetchInvoice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Announce invoice detail changes (issuer + status) via polite live region.
  // Debounce prevents spamming on rapid updates; no announcement fires on mount.
  useEffect(() => {
    if (invoice) {
      announce(`Loaded invoice from ${invoice.issuer}, status: ${invoice.status}`);
    }
  }, [invoice, announce]);

  useEffect(() => {
    if (error) {
      announce(`Failed to load invoice: ${error.message}`);
    }
  }, [error, announce]);

  if (loading) {
    return (
      <div
        className="animate-pulse flex flex-col space-y-4 p-6 bg-white rounded shadow"
        data-testid="invoice-detail-skeleton"
        aria-busy="true"
        aria-live="polite"
      >
        <div className="h-6 bg-gray-200 rounded w-1/3"></div>
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded shadow invoice-detail-container">
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-testid="invoice-detail-announcement"
        className="sr-only"
      >
        {announcement}
      </div>

      {error && (
        <ErrorBanner
          title="Could not load invoice details"
          message={error.message}
          onDismiss={() => setError(null)}
          className="mb-4"
        >
          <Button
            variant="secondary"
            size="small"
            onClick={() => fetchInvoice(true)}
            isLoading={isRetrying}
            className="mt-2"
          >
            Retry
          </Button>
        </ErrorBanner>
      )}

      {invoice && (
        <article aria-labelledby={`invoice-heading-${id}`}>
          <header className="flex justify-between items-center mb-6 border-b pb-4">
            <div>
              <h2 id={`invoice-heading-${id}`} className="text-2xl font-bold text-gray-900">
                {invoice.issuer}
              </h2>
              <p className="text-sm text-gray-500">Invoice #{invoice.id}</p>
            </div>
            <StatusPill status={invoice.status} />
          </header>

          <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Issuer</dt>
              <dd className="mt-1 text-lg font-semibold text-gray-900">{invoice.issuer}</dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500">Amount</dt>
              <dd className="mt-1 text-lg font-semibold text-gray-900">
                {formatCurrency(
                  invoice.amountValue ?? invoice.amount,
                  typeof invoice.currency === "string"
                    ? { currency: invoice.currency }
                    : invoice.currency
                )}
              </dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500">Estimated yield</dt>
              <dd className="mt-1 text-lg font-semibold text-gray-900">
                {invoice.yieldValue != null ? formatPercent(invoice.yieldValue) : invoice.yield}
              </dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500">Maturity date</dt>
              <dd className="mt-1 text-lg font-semibold text-gray-900">
                {formatDate(invoice.dueDate)}
              </dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500">Reference</dt>
              <dd className="mt-1 text-lg font-semibold text-gray-900 flex items-center gap-1.5">
                <span className="font-mono">{invoice.id}</span>
                <CopyButton
                  text={invoice.id}
                  label={copy.invoiceDetail.copyIdLabel}
                  successMessage={copy.invoiceDetail.copyIdSuccess}
                  errorMessage={copy.invoiceDetail.copyIdError}
                />
              </dd>
            </div>
          </dl>
        </article>
      )}
    </div>
  );
}
