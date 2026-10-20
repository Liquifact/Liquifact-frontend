import Link from "next/link";
import { notFound } from "next/navigation";
import NavMenu from "@/components/NavMenu";
import StatusPill from "@/components/StatusPill";
import InvoiceTimeline from "@/components/InvoiceTimeline";
import { copy } from "@/app/copy/en";
import { formatCurrency } from "@/lib/format/currency";
import { fetchInvoiceById } from "@/lib/invoiceSeoData.js";
import { cleanText, invoiceMeta, numericAmount, yieldPercent } from "@/lib/seo.js";
import FundActions from "../../invest/[id]/FundActions";

const detail = copy.invest.detail;
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export async function generateMetadata({ params }) {
  const { id } = await Promise.resolve(params);
  return invoiceMeta(await fetchInvoiceById(id), siteUrl, id);
}

function stringifyJsonLd(value) {
  return JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, (character) => {
    const escaped = {
      "<": "\\u003c",
      ">": "\\u003e",
      "&": "\\u0026",
      "\u2028": "\\u2028",
      "\u2029": "\\u2029",
    };
    return escaped[character];
  });
}

function invoiceJsonLd(invoice) {
  const issuer = cleanText(invoice.issuer ?? invoice.sme ?? invoice.smeName, "SME");
  const amount = numericAmount(invoice);
  const amountNumber = Number(String(amount ?? "").replace(/,/g, ""));
  const currency = cleanText(invoice.currency, "USD");
  const status = cleanText(invoice.status, "Unknown");
  const rate = yieldPercent(invoice);

  return {
    "@context": "https://schema.org",
    "@type": "Offer",
    name: `Invoice offering from ${issuer}`,
    description: `${issuer} invoice for ${formatCurrency(amount, { currency })}${
      rate === null ? "" : ` at ${rate.toFixed(2)}% yield`
    }. Status: ${status}.`,
    seller: { "@type": "Organization", name: issuer },
    price: Number.isFinite(amountNumber) ? amountNumber : undefined,
    priceCurrency: currency,
    availability:
      status.toLowerCase() === "open" ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
  };
}

export default async function InvoiceDetailPage({ params }) {
  const { id } = await Promise.resolve(params);
  const invoice = await fetchInvoiceById(id);

  if (!invoice) notFound();

  const amount = numericAmount(invoice);
  const amountNumber = Number(String(amount ?? "").replace(/,/g, ""));
  const issuer = cleanText(invoice.issuer ?? invoice.sme ?? invoice.smeName, "SME");
  const yieldValue = yieldPercent(invoice);
  const jsonLd = invoiceJsonLd(invoice);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 print-page-wrapper">
      <header className="no-print border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <Link
          href="/"
          className="inline-block py-3 text-xl font-semibold tracking-tight text-cyan-400 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 rounded"
        >
          LiquiFact
        </Link>
        <NavMenu />
      </header>

      <main id="main-content" className="max-w-4xl mx-auto px-6 py-12">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: stringifyJsonLd(jsonLd) }}
        />

        <Link
          href="/invest"
          className="no-print inline-block mb-6 text-sm text-slate-400 hover:text-cyan-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 rounded"
          aria-label={detail.backToMarketplaceLabel}
        >
          {detail.backToMarketplace}
        </Link>

        <h1 className="text-2xl font-bold mb-2">{cleanText(invoice.id, id)}</h1>
        <p className="text-slate-400 mb-8">{detail.pageSub}</p>

        <section
          aria-labelledby="invoice-summary-heading"
          className="print-invoice-section rounded-xl border border-slate-800 bg-slate-900/50 p-6 mb-6"
        >
          <h2 id="invoice-summary-heading" className="text-xl font-semibold mb-4">
            {issuer}
          </h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-slate-500">{detail.labelIssuer}</dt>
              <dd className="text-slate-100">{issuer}</dd>
            </div>
            <div>
              <dt className="text-slate-500">{detail.labelAmount}</dt>
              <dd className="text-slate-100">
                {formatCurrency(amount, { currency: cleanText(invoice.currency, "USD") })}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">{detail.labelYield}</dt>
              <dd className="text-slate-100">
                {yieldValue === null ? "—" : `${yieldValue.toFixed(2)}%`}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">{detail.labelMaturity}</dt>
              <dd className="text-slate-100">{cleanText(invoice.dueDate, "—")}</dd>
            </div>
            <div>
              <dt className="text-slate-500">{detail.labelStatus}</dt>
              <dd className="text-slate-100">
                <StatusPill status={invoice.status ?? ""} />
              </dd>
            </div>
          </dl>
        </section>

        <InvoiceTimeline status={invoice.status} timestamps={invoice.timestamps} className="mb-6" />
        <FundActions
          id={cleanText(invoice.id, id)}
          status={invoice.status}
          maxAmount={Number.isFinite(amountNumber) ? amountNumber : undefined}
          currency={invoice.currency}
          yieldValue={yieldValue}
          pathPrefix="/marketplace"
        />
      </main>
    </div>
  );
}

export { invoiceJsonLd, stringifyJsonLd };
