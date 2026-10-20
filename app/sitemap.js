import { fetchInvoicesForSitemap, isCancelledInvoice } from "../lib/invoiceSeoData.js";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const routes = ["/", "/invoices", "/invest"];

export default async function sitemap() {
  const staticRoutes = routes.map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 0.8,
  }));

  const invoices = await fetchInvoicesForSitemap();
  const invoiceRoutes = invoices
    .filter((invoice) => invoice?.id && !isCancelledInvoice(invoice))
    .map((invoice) => {
      const createdAt = invoice.createdAt ? new Date(invoice.createdAt) : null;
      return {
        url: `${baseUrl}/marketplace/${encodeURIComponent(invoice.id)}`,
        ...(createdAt && Number.isFinite(createdAt.getTime()) ? { lastModified: createdAt } : {}),
        changeFrequency: "daily",
        priority: 0.7,
      };
    });

  return [...staticRoutes, ...invoiceRoutes];
}
