import { MOCK_INVOICES } from "./invoiceFixtures.js";

const REQUEST_TIMEOUT_MS = 5_000;

export const SEO_DEMO_INVOICE = Object.freeze({
  id: "INV_0002",
  issuer: "Northwind Textiles",
  amount: 25_000,
  amountValue: 25_000,
  currency: "USDC",
  dueDate: "2026-12-31",
  yield: "6.50%",
  yieldValue: 6.5,
  yieldBps: 650,
  fundedPercent: 72,
  fundedAmount: 18_000,
  status: "Open",
  createdAt: "2025-01-15T00:00:00.000Z",
});

export const SEO_DEMO_INVOICES = Object.freeze([SEO_DEMO_INVOICE, ...MOCK_INVOICES]);

function apiUrl(path) {
  const baseUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001").replace(/\/+$/, "");
  return `${baseUrl}/api/invoices${path}`;
}

function timeoutSignal() {
  return AbortSignal.timeout(REQUEST_TIMEOUT_MS);
}

function invoiceFromPayload(payload) {
  if (Array.isArray(payload)) return null;
  if (!payload || typeof payload !== "object") return null;
  const invoice = payload.invoice ?? payload.data ?? payload;
  return invoice && typeof invoice === "object" && !Array.isArray(invoice) ? invoice : null;
}

export function getDemoInvoiceById(id) {
  return SEO_DEMO_INVOICES.find((invoice) => invoice.id === id) ?? null;
}

/**
 * Fetch one invoice with a bounded request time and local fixture fallback.
 *
 * @param {string} id
 * @returns {Promise<object|null>}
 */
export async function fetchInvoiceById(id) {
  try {
    const response = await fetch(`${apiUrl(`/${encodeURIComponent(id)}`)}`, {
      signal: timeoutSignal(),
      next: { revalidate: 60 },
    });
    if (!response.ok) return getDemoInvoiceById(id);

    const invoice = invoiceFromPayload(await response.json());
    return invoice ? { ...invoice, id: invoice.id ?? id } : getDemoInvoiceById(id);
  } catch {
    return getDemoInvoiceById(id);
  }
}

/**
 * Fetch invoices for sitemap generation. The returned fixture list is used
 * when the API is unavailable or returns an invalid payload.
 *
 * @returns {Promise<object[]>}
 */
export async function fetchInvoicesForSitemap() {
  try {
    const response = await fetch(apiUrl(""), {
      signal: timeoutSignal(),
      next: { revalidate: 60 },
    });
    if (!response.ok) return SEO_DEMO_INVOICES;

    const payload = await response.json();
    const invoices = Array.isArray(payload) ? payload : payload?.invoices ?? payload?.data;
    return Array.isArray(invoices) ? invoices : SEO_DEMO_INVOICES;
  } catch {
    return SEO_DEMO_INVOICES;
  }
}

export function isCancelledInvoice(invoice) {
  const status = String(invoice?.status ?? "").toLowerCase();
  return invoice?.cancelled === true || invoice?.canceled === true || status === "cancelled" || status === "canceled";
}

export { REQUEST_TIMEOUT_MS };
