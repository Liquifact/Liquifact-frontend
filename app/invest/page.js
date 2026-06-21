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
const FILTER_PREVIEW_NOTE_ID = "invest-filter-preview-note";
const FILTER_CONTROLS = [
  { id: "yield-range", label: "Yield Range", hasDropdown: true },
  { id: "currency", label: "Currency", hasDropdown: true },
  { id: "maturity-date", label: "Maturity Date", hasDropdown: true },
  { id: "sort-options", label: "Sort: Best Yield", hasDropdown: true },
  { id: "clear-filters", label: "Clear Filters", alignEnd: true },
];

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
          className="inline-block py-3 text-xl font-semibold tracking-tight text-cyan-400 hover:underline"
        >
          ← LiquiFact
        </Link>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold mb-2">{copy.invest.title}</h1>
        <p className="text-slate-400 mb-8">
          {copy.invest.subtext}
        </p>

        <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
          {statusMessage}
        </p>

        {/* Keep preview controls discoverable to keyboards and screen readers while backend filtering is unavailable. */}
        <fieldset
          className="mb-8 rounded-xl border border-slate-800 bg-slate-900/30 p-6"
          aria-describedby={FILTER_PREVIEW_NOTE_ID}
        >
          <legend className="sr-only">Marketplace filters preview</legend>
          <p id={FILTER_PREVIEW_NOTE_ID} className="sr-only">
            Marketplace filters are preview controls and are coming soon. They
            are not interactive yet.
          </p>
          <div className="flex flex-wrap gap-4 items-center">
            {FILTER_CONTROLS.map((control) => {
              const badgeId = `${control.id}-status`;

              return (
                <div
                  key={control.id}
                  className={`flex items-center gap-2 ${control.alignEnd ? "ml-auto" : ""}`}
                >
                  <button
                    type="button"
                    aria-disabled="true"
                    aria-describedby={`${badgeId} ${FILTER_PREVIEW_NOTE_ID}`}
                    onClick={(event) => event.preventDefault()}
                    className="rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2 text-sm text-white cursor-not-allowed opacity-60 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
                  >
                    {control.label}
                    {control.hasDropdown ? (
                      <svg
                        className="inline-block ml-2 w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    ) : null}
                  </button>
                  <span
                    id={badgeId}
                    className="inline-flex items-center rounded-full bg-slate-700/60 px-2.5 py-1 text-xs font-medium text-slate-200"
                  >
                    Soon
                  </span>
                </div>
              );
            })}
          </div>
        </fieldset>

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
