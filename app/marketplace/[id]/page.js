import { notFound } from "next/navigation";
import InvoiceDetail from "./InvoiceDetail";
import { getInvoiceForPage } from "@/lib/invoiceSeoData";
import { invoiceJsonLd, invoiceMeta, stringifyJsonLd } from "@/lib/seo";

// Metadata and the page share one cached server fetch per request (#1522).
export async function generateMetadata({ params }) {
  const { id } = await params;
  return invoiceMeta(await getInvoiceForPage(id), id);
}

export default async function InvoicePage({ params }) {
  const { id } = await params;
  const invoice = await getInvoiceForPage(id);
  // Missing and cancelled invoices are not public, matching the sitemap rules.
  if (!invoice) notFound();
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: stringifyJsonLd(invoiceJsonLd(invoice)) }} />
      <InvoiceDetail id={id} initialInvoice={invoice} />
    </>
  );
}
