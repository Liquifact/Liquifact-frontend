import { API_URL } from "./config.js";
import { DEMO_INVOICES } from "./demo.js";

const RETRY_DELAYS_MS = [300, 900];
const MAX_RETRY_AFTER_MS = 2000;
const RETRYABLE_STATUSES = new Set([502, 503, 504, 429]);

const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function jitter(ms, random = Math.random) {
  return Math.round(ms * (0.8 + random() * 0.4));
}

function parseRetryAfter(value) {
  if (value == null) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  const date = Date.parse(value);
  if (!Number.isNaN(date)) return Math.max(0, date - Date.now());
  return null;
}

async function attempt(path, options, includeCacheMetadata) {
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
      err.retryAfterMs = parseRetryAfter(res.headers?.get?.("retry-after"));
      throw err;
    }
    if (!includeCacheMetadata) return body;
    const stale = res.headers.get("x-liquifact-cache") === "stale";
    return { ...body, offline: stale, stale, cachedAt: res.headers.get("x-liquifact-cached-at") };
  } finally {
    clearTimeout(timer);
  }
}

function isRetryable(err) {
  if (err.status === undefined) return true; // network error / abort
  return RETRYABLE_STATUSES.has(err.status);
}

async function request(path, options = {}, includeCacheMetadata = false, retry = {}) {
  const method = (options.method || "GET").toUpperCase();
  const isGet = method === "GET";
  const retries = isGet ? (retry.retries ?? 2) : 0;
  const sleep = retry.sleep ?? defaultSleep;
  const random = retry.random ?? Math.random;
  const delays = retry.delays ?? RETRY_DELAYS_MS;

  for (let i = 0; ; i++) {
    try {
      return await attempt(path, options, includeCacheMetadata);
    } catch (err) {
      if (i >= retries || !isRetryable(err)) throw err;
      let waitMs;
      if (err.status === 429 && err.retryAfterMs != null) {
        waitMs = Math.min(err.retryAfterMs, MAX_RETRY_AFTER_MS);
      } else {
        waitMs = jitter(delays[Math.min(i, delays.length - 1)], random);
      }
      await sleep(waitMs);
    }
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
export const createInvoice = (payload, { idempotencyKey } = {}) =>
  request("/api/invoices", {
    method: "POST",
    body: JSON.stringify(payload),
    headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : undefined,
  });
export const fundInvoice = (id, amount) =>
  request(`/api/invoices/${encodeURIComponent(id)}/fund`, { method: "POST", body: JSON.stringify({ amount }) });
