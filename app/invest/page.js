"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import InvoiceListSkeleton from "@/components/InvoiceListSkeleton";

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

export default function InvestPage() {
  const [invoices, setInvoices] = useState(null); // null = loading

  useEffect(() => {
    const timer = setTimeout(() => setInvoices(MOCK_INVOICES), DEV_DELAY);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 px-6 py-4">
        <Link
          href="/"
          className="text-xl font-semibold tracking-tight text-cyan-400 hover:underline"
        >
          ← LiquiFact
        </Link>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold mb-2">Invest</h1>
        <p className="text-slate-400 mb-8">
          Browse tokenized invoices and fund them. Estimated yield is shown for educational purposes; actual payment is received at invoice maturity.
        </p>

        {invoices === null ? (
          <InvoiceListSkeleton rows={3} />
        ) : invoices.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-8 text-center text-slate-500">
            No investable invoices. Connect wallet to see the marketplace.
          </div>
        ) : (
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
                <div className="flex gap-6 text-sm text-slate-400">
                  <span>
                    {inv.currency}&nbsp;{inv.amount}
                  </span>
                  <span>Est. yield&nbsp;{inv.yield}</span>
                  <span>Maturity&nbsp;{inv.dueDate}</span>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900/30 p-4 text-sm text-slate-400">
            Note: Yield references are educational only and reflect on-chain basis-point assumptions. Invoice contracts settle at maturity.
          </div>
        )}
      </main>
    </div>
  );
}
