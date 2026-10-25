// Server-side invoice reads for SEO metadata, share images and the sitemap (#1383).
// Requests are time-bounded and fall back to the bundled demo invoices.
import { API_URL } from "./config.js";
import { DEMO_INVOICES } from "./demo.js";

export const REQUEST_TIMEOUT_MS = 5_000;

function apiUrl(path) {
  return `${API_URL}/api/invoices${path}`;
}

function invoiceFromPayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const invoice = payload.data ?? payload.invoice ?? payload;
  return invoice && typeof invoice === "object" && !Array.isArray(invoice) ? invoice : null;
}

export function getDemoInvoiceById(id) {
  return DEMO_INVOICES.find((invoice) => invoice.id === id) ?? null;
}

/**
 * Fetch one invoice with a bounded request time. A 404 means "not found";
 * any other failure falls back to the matching demo invoice.
 * @param {string} id
 * @param {{ fetchFn?: typeof fetch }} [opts]
 * @returns {Promise<object|null>}
 */
export async function fetchInvoiceById(id, { fetchFn = globalThis.fetch } = {}) {
  try {
    const response = await fetchFn(apiUrl(`/${encodeURIComponent(id)}`), {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      next: { revalidate: 60 },
    });
    if (response.status === 404) return null;
    if (!response.ok) return getDemoInvoiceById(id);
    const invoice = invoiceFromPayload(await response.json());
    return invoice ? { ...invoice, id: invoice.id ?? id } : getDemoInvoiceById(id);
  } catch {
    return getDemoInvoiceById(id);
  }
}

/**
 * Fetch invoices for sitemap generation, falling back to the demo list.
 * @param {{ fetchFn?: typeof fetch }} [opts]
 * @returns {Promise<object[]>}
 */
export async function fetchInvoicesForSitemap({ fetchFn = globalThis.fetch } = {}) {
  try {
    const response = await fetchFn(apiUrl(""), {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      next: { revalidate: 60 },
    });
    if (!response.ok) return DEMO_INVOICES;
    const payload = await response.json();
    const invoices = Array.isArray(payload) ? payload : payload?.data ?? payload?.invoices;
    return Array.isArray(invoices) ? invoices : DEMO_INVOICES;
  } catch {
    return DEMO_INVOICES;
  }
}

export function isCancelledInvoice(invoice) {
  const status = String(invoice?.status ?? "").toLowerCase();
  return invoice?.cancelled === true || invoice?.canceled === true || status === "cancelled" || status === "canceled";
}
