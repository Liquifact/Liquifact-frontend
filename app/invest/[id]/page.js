"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import ErrorBanner from "@/components/ErrorBanner";
import FundAmountInput from "@/components/FundAmountInput";
import InvoiceListSkeleton from "@/components/InvoiceListSkeleton";
import StatusPill from "@/components/StatusPill";
import WalletStatus from "@/components/WalletStatus";
import { useToast } from "@/components/ToastProvider";
import { useWallet, WALLET_STATES } from "@/components/WalletContext";
import { INVALID_VALUE_FALLBACK, formatAmount, formatCurrency } from "@/lib/format/currency";
import { getInvoiceById } from "../lib";

const DEV_DELAY = process.env.NODE_ENV === "development" ? 800 : 0;

function loadInvoiceById(id) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(getInvoiceById(id)), DEV_DELAY);
  });
}

function formatYield(value) {
  const formattedYield = formatAmount(value);
  return formattedYield === INVALID_VALUE_FALLBACK ? formattedYield : `${formattedYield}%`;
}

function sanitizeText(value) {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value).trim();

  return text.replace(/[<>{}"']/g, "");
}

function buildInvoiceJsonLd(invoice) {
  if (!invoice) {
    return null;
  }

  const issuer = sanitizeText(invoice.issuer);
  const amount = sanitizeText(invoice.amount);
  const currency = sanitizeText(invoice.currency);
  const dueDate = sanitizeText(invoice.dueDate);
  const yieldValue = sanitizeText(invoice.yield);
  const status = sanitizeText(invoice.status);
  const descriptionParts = [
    issuer ? `Invoice offering from ${issuer}` : "Invoice offering",
    amount ? `Amount ${amount}` : null,
    currency ? `Currency ${currency}` : null,
    dueDate ? `Maturity ${dueDate}` : null,
    yieldValue ? `Estimated yield ${yieldValue}` : null,
    status ? `Status ${status}` : null,
  ].filter(Boolean);

  return {
    "@context": "https://schema.org",
    "@type": "Offer",
    name: issuer ? `Invoice offering from ${issuer}` : "Invoice offering",
    description: descriptionParts.join(". "),
    seller: issuer
      ? {
          "@type": "Organization",
          name: issuer,
        }
      : undefined,
    price: amount || undefined,
    priceCurrency: currency || undefined,
    availability: status === "Open" ? "https://schema.org/InStock" : undefined,
    validFrom: dueDate || undefined,
  };
}

export function copyToClipboardFallback(text) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand("copy");
  } finally {
    document.body.removeChild(textarea);
  }
}

export async function copyInvoiceUrl(id) {
  const url = `${window.location.origin}/invest/${id}`;
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(url);
  } else {
    copyToClipboardFallback(url);
  }
  return url;
}

export function InvoiceDetail({ loadInvoice = loadInvoiceById }) {
  const params = useParams();
  const id = params?.id;
  const [invoice, setInvoice] = useState(null);
  const [loadError, setLoadError] = useState("");
  const { state: walletState, connect } = useWallet();
  const toast = useToast();

  const handleCopyLink = useCallback(async () => {
    try {
      await copyInvoiceUrl(id);
      toast.success("Invoice link copied to clipboard.", "Link copied");
    } catch {
      toast.error("Could not copy link to clipboard.", "Copy failed");
    }
  }, [id, toast]);

  useEffect(() => {
    if (!id) {
      return;
    }

    let isActive = true;

    const load = async () => {
      try {
        const inv = await loadInvoice(id);

        if (!isActive) {
          return;
        }

        if (!inv) {
          notFound();
          return;
        }

        setInvoice(inv);
      } catch {
        if (!isActive) {
          return;
        }

        setLoadError("Unable to load invoice details right now.");
      }
    };

    void load();

    return () => {
      isActive = false;
    };
  }, [id, loadInvoice]);

  if (!id) {
    return notFound();
  }

  const handleFund = async (amount) => {
    if (walletState === WALLET_STATES.DISCONNECTED) {
      connect();
      return;
    }
    // Placeholder: replace with real on-chain funding call once Stellar integration is ready
    toast.success(
      `Funding request for ${amount} submitted. Awaiting wallet approval.`,
      "Funding submitted"
    );
  };

  const isFundingDisabled =
    walletState === WALLET_STATES.CONNECTING || walletState === WALLET_STATES.NO_WALLET;
  const invoiceJsonLd = buildInvoiceJsonLd(invoice);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 print-page-wrapper">
      <header className="no-print border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <Link
          href="/"
          className="inline-block py-3 text-xl font-semibold tracking-tight text-cyan-400 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 rounded"
        >
          ← LiquiFact
        </Link>
        <WalletStatus />
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {invoiceJsonLd ? (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(invoiceJsonLd) }}
          />
        ) : null}
        <Link
          href="/invest"
          className="no-print inline-block mb-6 text-sm text-slate-400 hover:text-cyan-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 rounded"
          aria-label="Back to marketplace"
        >
          ← Back to marketplace
        </Link>

        <h1 className="text-2xl font-bold mb-2">Invoice details</h1>
        <p className="text-slate-400 mb-8">Review the invoice terms before funding.</p>

        {loadError ? (
          <ErrorBanner
            variant="error"
            title="Unable to load invoice details"
            description={loadError}
            previewLabel="Invoice detail"
          />
        ) : invoice === null ? (
          <InvoiceListSkeleton rows={1} />
        ) : (
          <>
            <section
              aria-labelledby="invoice-summary-heading"
              className="print-invoice-section rounded-xl border border-slate-800 bg-slate-900/50 p-6 mb-6"
            >
              <h2 id="invoice-summary-heading" className="text-xl font-semibold mb-4">
                {invoice.issuer}
              </h2>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-slate-500">Issuer</dt>
                  <dd className="text-slate-100">{invoice.issuer}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Amount</dt>
                  <dd className="text-slate-100">
                    {formatCurrency(invoice.amount, {
                      currency: invoice.currency,
                    })}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Estimated yield</dt>
                  <dd className="text-slate-100">{formatYield(invoice.yield)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Maturity date</dt>
                  <dd className="text-slate-100">{invoice.dueDate}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Status</dt>
                  <dd className="text-slate-100">
                    <StatusPill status={invoice.status ?? ""} />
                  </dd>
                </div>
              </dl>
            </section>

            {/* Partial funding input — only shown for Open invoices */}
            {invoice.status === "Open" && (
              <div className="no-print">
                <FundAmountInput
                  maxAmount={invoice.amountValue ?? 0}
                  currency={invoice.currency ?? "USD"}
                  yieldValue={invoice.yieldValue ?? 0}
                  onSubmit={handleFund}
                  disabled={isFundingDisabled}
                />
              </div>
            )}

            <div className="no-print mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleCopyLink}
                className="rounded-full border border-slate-700 text-slate-300 px-6 py-3 text-sm font-medium hover:bg-slate-800/50 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950 focus:ring-cyan-500"
                aria-label="Copy invoice link to clipboard"
              >
                Copy link
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="rounded-full border border-slate-700 text-slate-300 px-6 py-3 text-sm font-medium hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950 focus:ring-cyan-500"
                aria-label="Print or save this invoice as PDF"
              >
                Print / Save PDF
              </button>
            </div>

            <div className="no-print mt-6 rounded-xl border border-slate-800 bg-slate-900/30 p-4 text-sm text-slate-300">
              Note: Yield references are educational only and reflect on-chain basis-point
              assumptions. Invoice contracts settle at maturity. Funding commits principal and is
              subject to wallet approval.
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default function InvoiceDetailPage() {
  return <InvoiceDetail />;
}
