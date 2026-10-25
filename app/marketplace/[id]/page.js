import InvoiceDetail from "./InvoiceDetail";
import { fetchInvoiceById } from "@/lib/invoiceSeoData";
import { invoiceJsonLd, invoiceMeta, stringifyJsonLd } from "@/lib/seo";

export async function generateMetadata({ params }) {
  const { id } = await params;
  return invoiceMeta(await fetchInvoiceById(id), id);
}

export default async function InvoicePage({ params }) {
  const { id } = await params;
  const invoice = await fetchInvoiceById(id);
  return (
    <>
      {invoice && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: stringifyJsonLd(invoiceJsonLd(invoice)) }} />
      )}
      <InvoiceDetail id={id} />
    </>
  );
}
