"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ErrorBanner from "@/components/ErrorBanner";
import InvoiceListSkeleton from "@/components/InvoiceListSkeleton";
import { copy } from "../copy/en";

/**
 * Mock invoice data — replace with real API call once the backend endpoint
 * is available (follow-up: link backend issue here).
 *
 * Contract per item: { id, issuer, amount, currency, dueDate, yield, status }
 * NOTE: yield values are illustrative; contracts use on-chain basis points and actual settlement is at maturity.
 */
const MOCK_INVOICES = [
  {
    id: "inv-001",
    issuer: "Acme Supplies Ltd",
    amount: "12,500",
    currency: "USD",
    dueDate: "2026-06-15",
    yield: "8.2%",
    status: "Open",
  },
  {
    id: "inv-002",
    issuer: "Bright Logistics GmbH",
    amount: "7,800",
    currency: "EUR",
    dueDate: "2026-07-01",
    yield: "7.5%",
    status: "Open",
  },
  {
    id: "inv-003",
    issuer: "Sunrise Exports Pte",
    amount: "22,000",
    currency: "USD",
    dueDate: "2026-05-30",
    yield: "9.1%",
    status: "Open",
  },
];

// DEV-only delay (ms) to make the skeleton visible during local development.
const DEV_DELAY = process.env.NODE_ENV === "development" ? 1500 : 0;

function loadMockInvoices() {
  return new Promise((resolve) => {
    setTimeout(() => resolve(MOCK_INVOICES), DEV_DELAY);
  });
}

export function getInvoiceLoadAnnouncement(invoices) {
  if (!Array.isArray(invoices) || invoices.length === 0) {
    return "No invoices available";
  }

  return `${invoices.length} investable invoices loaded`;
}

export function InvestMarketplace({ loadInvoices = loadMockInvoices }) {
  const [invoices, setInvoices] = useState(null); // null = loading
  const [statusMessage, setStatusMessage] = useState("");
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let isActive = true;

    const announceLoadCompletion = async () => {
      try {
        const nextInvoices = await loadInvoices();

        if (!isActive) {
          return;
        }

        const normalizedInvoices = Array.isArray(nextInvoices)
          ? nextInvoices
          : [];

        setInvoices(normalizedInvoices);
        setStatusMessage(getInvoiceLoadAnnouncement(normalizedInvoices));
      } catch {
        if (!isActive) {
          return;
        }

        setInvoices([]);
        setLoadError("Unable to load investable invoices right now.");
        setStatusMessage("Unable to load investable invoices.");
      }
    };

    void announceLoadCompletion();

    return () => {
      isActive = false;
    };
  }, [loadInvoices]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 px-6 py-4">
        <Link
          href="/"
          className="focus-ring inline-block py-3 text-xl font-semibold tracking-tight text-cyan-400 hover:underline"
        >
          ← LiquiFact
        </Link>
      </header>

      <main id="main-content" tabIndex={-1} className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold mb-2">{copy.invest.title}</h1>
        <p className="text-slate-400 mb-8">
          {copy.invest.subtext}
        </p>

        <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
          {statusMessage}
        </p>

        {/* Filter Controls - Disabled with Coming Soon Indicators */}
        <div className="mb-8 rounded-xl border border-slate-800 bg-slate-900/30 p-6">
          <div className="flex flex-wrap gap-4 items-center">
            {/* Yield Range Filter */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled
                className="rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2 text-sm text-slate-500 cursor-not-allowed opacity-60 transition-colors"
                aria-label="Yield range filter (coming soon)"
              >
                Yield Range
                <svg className="inline-block ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <span className="inline-flex items-center rounded-full bg-slate-700/60 px-2.5 py-1 text-xs font-medium text-slate-300">
                Soon
              </span>
            </div>

            {/* Currency Filter */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled
                className="rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2 text-sm text-slate-500 cursor-not-allowed opacity-60 transition-colors"
                aria-label="Currency filter (coming soon)"
              >
                Currency
                <svg className="inline-block ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <span className="inline-flex items-center rounded-full bg-slate-700/60 px-2.5 py-1 text-xs font-medium text-slate-300">
                Soon
              </span>
            </div>

            {/* Maturity Date Filter */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled
                className="rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2 text-sm text-slate-500 cursor-not-allowed opacity-60 transition-colors"
                aria-label="Maturity date filter (coming soon)"
              >
                Maturity Date
                <svg className="inline-block ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <span className="inline-flex items-center rounded-full bg-slate-700/60 px-2.5 py-1 text-xs font-medium text-slate-300">
                Soon
              </span>
            </div>

            {/* Sort Options */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled
                className="rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2 text-sm text-slate-500 cursor-not-allowed opacity-60 transition-colors"
                aria-label="Sort options (coming soon)"
              >
                Sort: Best Yield
                <svg className="inline-block ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <span className="inline-flex items-center rounded-full bg-slate-700/60 px-2.5 py-1 text-xs font-medium text-slate-300">
                Soon
              </span>
            </div>

            {/* Clear Filters - Also Disabled */}
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                disabled
                className="rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2 text-sm text-slate-500 cursor-not-allowed opacity-60 transition-colors"
                aria-label="Clear filters (coming soon)"
              >
                Clear Filters
              </button>
              <span className="inline-flex items-center rounded-full bg-slate-700/60 px-2.5 py-1 text-xs font-medium text-slate-300">
                Soon
              </span>
            </div>
          </div>
        </div>

        {loadError ? (
          <ErrorBanner
            variant="error"
            title="Unable to load investable invoices"
            description={loadError}
            previewLabel="Marketplace status"
          />
        ) : invoices === null ? (
          <InvoiceListSkeleton rows={3} />
        ) : invoices.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-8 text-center text-slate-300">
            {copy.invest.emptyState}
          </div>
        ) : (
          <>
            <ul className="space-y-4">
              {invoices.map((inv) => (
                <li
                  key={inv.id}
                  className="rounded-xl border border-slate-800 bg-slate-900/50 p-5"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium text-slate-100">
                      {inv.issuer}
                    </span>
                    <span className="text-xs font-semibold px-2 py-1 rounded-full bg-cyan-900/60 text-cyan-300">
                      {inv.status}
                    </span>
                  </div>
                  <div className="flex gap-6 text-sm text-slate-300">
                    <span>
                      {inv.currency}&nbsp;{inv.amount}
                    </span>
                    <span>Est. yield&nbsp;{inv.yield}</span>
                    <span>Maturity&nbsp;{inv.dueDate}</span>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900/30 p-4 text-sm text-slate-300">
              Note: Yield references are educational only and reflect on-chain basis-point assumptions. Invoice contracts settle at maturity.
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default function InvestPage() {
  return <InvestMarketplace />;
}
