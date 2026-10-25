import { SITE_URL } from "@/lib/config";
import { fetchInvoicesForSitemap, isCancelledInvoice } from "../lib/invoiceSeoData.js";

export default async function sitemap() {
  const staticRoutes = ["", "/marketplace", "/submit", "/get-started", "/docs"].map((p) => ({ url: `${SITE_URL}${p}`, lastModified: new Date() }));
  const invoices = await fetchInvoicesForSitemap();
  const invoiceRoutes = invoices
    .filter((invoice) => invoice?.id && !isCancelledInvoice(invoice))
    .map((invoice) => {
      const createdAt = invoice.createdAt ? new Date(invoice.createdAt) : null;
      return {
        url: `${SITE_URL}/marketplace/${encodeURIComponent(invoice.id)}`,
        ...(createdAt && Number.isFinite(createdAt.getTime()) ? { lastModified: createdAt } : {}),
        changeFrequency: "daily",
        priority: 0.7,
      };
    });
  return [...staticRoutes, ...invoiceRoutes];
}