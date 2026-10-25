import { fetchInvoicesForSitemap, isCancelledInvoice } from "../lib/invoiceSeoData.js";

const BASE = process.env.NEXT_PUBLIC_SITE_URL || "https://liquifact-frontend.vercel.app";

export default async function sitemap() {
  const staticRoutes = ["", "/marketplace", "/submit", "/get-started", "/docs"].map((p) => ({ url: `${BASE}${p}`, lastModified: new Date() }));
  const invoices = await fetchInvoicesForSitemap();
  const invoiceRoutes = invoices
    .filter((invoice) => invoice?.id && !isCancelledInvoice(invoice))
    .map((invoice) => {
      const createdAt = invoice.createdAt ? new Date(invoice.createdAt) : null;
      return {
        url: `${BASE}/marketplace/${encodeURIComponent(invoice.id)}`,
        ...(createdAt && Number.isFinite(createdAt.getTime()) ? { lastModified: createdAt } : {}),
        changeFrequency: "daily",
        priority: 0.7,
      };
    });
  return [...staticRoutes, ...invoiceRoutes];
}
