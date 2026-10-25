import { NetworkError, TimeoutError, HttpError } from "./errors.js";
import { parseInvoice, parseInvoiceList } from "./schemas.js";

/**
 * @param {unknown} error
 */
function isConnectivityError(error) {
  return error instanceof NetworkError || error instanceof TimeoutError;
}

/**
 * @param {Object} deps
 * @param {Object} deps.client
 * @param {Array} deps.demoInvoices
 */
export function createInvoicesApi(deps) {
  const { client, demoInvoices } = deps;

  /**
   * @param {Object} [opts]
   * @param {string} [opts.status]
   * @param {AbortSignal} [opts.signal]
   */
  async function listInvoices(opts = {}) {
    const { status, signal } = opts;
    const q = status ? `?status=${encodeURIComponent(status)}` : "";
    try {
      const body = await client.request(`/api/invoices${q}`, { signal });
      const raw = body && typeof body === "object" && "data" in body ? body.data : body;
      const data = parseInvoiceList(raw);
      return { data, offline: false };
    } catch (err) {
      if (isConnectivityError(err)) {
        const data = status ? demoInvoices.filter((i) => i.status === status) : demoInvoices;
        return { data, offline: true };
      }
      throw err;
    }
  }

  /**
   * @param {string} id
   * @param {Object} [opts]
   * @param {AbortSignal} [opts.signal]
   */
  async function getInvoice(id, opts = {}) {
    const { signal } = opts;
    try {
      const body = await client.request(`/api/invoices/${encodeURIComponent(id)}`, { signal });
      const raw = body && typeof body === "object" && "data" in body ? body.data : body;
      const data = parseInvoice(raw);
      return { data, offline: false };
    } catch (err) {
      if (err instanceof HttpError && err.status === 404) {
        return { data: null, offline: false };
      }
      if (isConnectivityError(err)) {
        const data = demoInvoices.find((i) => i.id === id) || null;
        return { data, offline: true };
      }
      throw err;
    }
  }

  /**
   * @param {unknown} payload
   * @param {Object} [opts]
   * @param {AbortSignal} [opts.signal]
   */
  async function createInvoice(payload, opts = {}) {
    const { signal } = opts;
    const body = await client.request("/api/invoices", { method: "POST", body: payload, signal });
    const raw = body && typeof body === "object" && "data" in body ? body.data : body;
    return { data: parseInvoice(raw), offline: false };
  }

  /**
   * @param {string} id
   * @param {number} amount
   * @param {Object} [opts]
   * @param {AbortSignal} [opts.signal]
   */
  async function fundInvoice(id, amount, opts = {}) {
    const { signal } = opts;
    const body = await client.request(`/api/invoices/${encodeURIComponent(id)}/fund`, {
      method: "POST",
      body: { amount },
      signal,
    });
    const raw = body && typeof body === "object" && "data" in body ? body.data : body;
    return { data: parseInvoice(raw), offline: false };
  }

  return { listInvoices, getInvoice, createInvoice, fundInvoice };
}
