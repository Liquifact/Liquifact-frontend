import { API_URL } from "./config.js";
import { DEMO_INVOICES } from "./demo.js";

async function request(path, options = {}, includeCacheMetadata = false) {
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
    if (!includeCacheMetadata) return body;
    const stale = res.headers.get("x-liquifact-cache") === "stale";
    return { ...body, offline: stale, stale, cachedAt: res.headers.get("x-liquifact-cached-at") };
  } finally {
    clearTimeout(timer);
  }
}

export async function listInvoices(status) {
  try {
    const q = status ? `?status=${encodeURIComponent(status)}` : "";
    return await request(`/api/invoices${q}`, {}, true);
  } catch {
    const data = status ? DEMO_INVOICES.filter((i) => i.status === status) : DEMO_INVOICES;
    return { data, offline: true };
  }
}

export async function getInvoice(id) {
  try {
    return await request(`/api/invoices/${encodeURIComponent(id)}`, {}, true);
  } catch (err) {
    if (err.status === 404) return { data: null, offline: false };
    return { data: DEMO_INVOICES.find((i) => i.id === id) || null, offline: true };
  }
}

export const getStats = () => request("/api/stats");
export const getHealth = () => request("/health");
export const getEscrowLive = () => request("/api/escrow/live");
export const createInvoice = (payload) => request("/api/invoices", { method: "POST", body: JSON.stringify(payload) });

export const SME_INVOICES_STORAGE_KEY = "liquifact-sme-invoices";

export function rememberSmeInvoice(id) {
  if (typeof window === "undefined" || !id) return;
  try {
    const raw = window.localStorage.getItem(SME_INVOICES_STORAGE_KEY);
    const ids = raw ? JSON.parse(raw) : [];
    const list = Array.isArray(ids) ? ids : [];
    if (!list.includes(id)) {
      window.localStorage.setItem(SME_INVOICES_STORAGE_KEY, JSON.stringify([...list, id]));
    }
  } catch {
    // ignore storage failures (private mode, quota, corrupt data)
  }
}

export const fundInvoice = (id, amount) =>
  request(`/api/invoices/${encodeURIComponent(id)}/fund`, { method: "POST", body: JSON.stringify({ amount }) });
