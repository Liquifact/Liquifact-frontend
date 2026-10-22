import { API_URL } from "./config";
import { DEMO_INVOICES } from "./demo";

async function request(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(body.error || `Request failed (${res.status})`);
      err.status = res.status;
      err.details = body.details;
      throw err;
    }
    return body;
  } finally {
    clearTimeout(timer);
  }
}

export async function listInvoices(status) {
  try {
    const q = status ? `?status=${encodeURIComponent(status)}` : "";
    const { data } = await request(`/api/invoices${q}`);
    return { data, offline: false };
  } catch {
    const data = status ? DEMO_INVOICES.filter((i) => i.status === status) : DEMO_INVOICES;
    return { data, offline: true };
  }
}

export async function getInvoice(id) {
  try {
    const { data } = await request(`/api/invoices/${encodeURIComponent(id)}`);
    return { data, offline: false };
  } catch (err) {
    if (err.status === 404) return { data: null, offline: false };
    return { data: DEMO_INVOICES.find((i) => i.id === id) || null, offline: true };
  }
}

export const getStats = () => request("/api/stats");
export const getHealth = () => request("/health");
export const getEscrowLive = () => request("/api/escrow/live");
export { request };
export const createInvoice = (payload) => request("/api/invoices", { method: "POST", body: JSON.stringify(payload) });
export const fundInvoice = (id, amount) =>
  request(`/api/invoices/${encodeURIComponent(id)}/fund`, { method: "POST", body: JSON.stringify({ amount }) });
