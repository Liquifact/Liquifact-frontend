"use client";

/**
 * @file app/invest/[id]/InvoiceDetailData.jsx
 *
 * Renders the invoice detail content when data is successfully loaded.
 * Extracted from the original server component to enable client-side rendering
 * after data fetching completes.
 */

import { copy } from "@/app/copy/en";
import { INVALID_VALUE_FALLBACK, formatCurrency, formatAmount } from "@/lib/format/currency";
import StatusPill from "@/components/StatusPill";
import InvoiceTimeline from "@/components/InvoiceTimeline";
import FundActions from "./FundActions";
import Link from "next/link";

const detail = copy.invest.detail;

// ── Pure client-side helpers ──────────────────────────────────────────────────

/**
 * Format a yield value as a percentage string.
 * Falls back to `INVALID_VALUE_FALLBACK` for unresolvable values.
 *
 * @param {string|number|null|undefined} value
 * @returns {string}
 */
function formatYield(value) {
  const formatted = formatAmount(value);
  return formatted === INVALID_VALUE_FALLBACK ? formatted : `${formatted}%`;
}

/**
 * @param {object} props
 * @param {object} props.invoice - Invoice object from loadInvoice
 * @returns {JSX.Element}
 */
export default function InvoiceDetailData({ invoice }) {
  return (
    <>
      {/* ── Back navigation ───────────────────────────────────────── */}
      <Link
        href="/invest"
        className="no-print inline-block mb-6 text-sm text-slate-400 hover:text-cyan-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 rounded"
        aria-label={detail.backToMarketplaceLabel}
      >
        {detail.backToMarketplace}
      </Link>

      {/* ── Page heading ──────────────────────────────────────────── */}
      <h1 className="text-2xl font-bold mb-2">{detail.pageTitle}</h1>
      <p className="text-slate-400 mb-8">{detail.pageSub}</p>

      {/* ── Invoice metadata ────────────── */}
      <section
        aria-labelledby="invoice-summary-heading"
        className="print-invoice-section rounded-xl border border-slate-800 bg-slate-900/50 p-6 mb-6"
      >
        <h2 id="invoice-summary-heading" className="text-xl font-semibold mb-4">
          {invoice.issuer}
        </h2>

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-slate-500">{detail.labelIssuer}</dt>
            <dd className="text-slate-100">{invoice.issuer}</dd>
          </div>
          <div>
            <dt className="text-slate-500">{detail.labelAmount}</dt>
            <dd className="text-slate-100">
              {formatCurrency(invoice.amount, { currency: invoice.currency })}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">{detail.labelYield}</dt>
            <dd className="text-slate-100">{formatYield(invoice.yield)}</dd>
          </div>
          <div>
            <dt className="text-slate-500">{detail.labelMaturity}</dt>
            <dd className="text-slate-100">{invoice.dueDate}</dd>
          </div>
          <div>
            <dt className="text-slate-500">{detail.labelStatus}</dt>
            <dd className="text-slate-100">
              <StatusPill status={invoice.status ?? ""} />
            </dd>
          </div>
        </dl>
      </section>

      {/* ── Lifecycle timeline (status-driven) ─────────────────────── */}
      <InvoiceTimeline status={invoice.status} timestamps={invoice.timestamps} className="mb-6" />

      {/* ── Interactive controls (Fund / Copy / Print) ─────────────── */}
      <FundActions
        id={invoice.id}
        status={invoice.status}
        maxAmount={invoice.amountValue}
        currency={invoice.currency}
        yieldValue={invoice.yieldValue}
      />
    </>
  );
}