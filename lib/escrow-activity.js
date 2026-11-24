import { scValToNative, xdr } from "@stellar/stellar-sdk";

/** Structured RPC failure with a stable code instead of a raw error string. */
export class EscrowActivityError extends Error {
  constructor(code, message, { status, rpcMessage, cause } = {}) {
    super(message);
    this.name = "EscrowActivityError";
    this.code = code;
    this.status = status;
    this.rpcMessage = rpcMessage;
    if (cause) this.cause = cause;
  }
}

export function decodeContractEvent(event) {
  const topics = (event.topic || []).map((topic) =>
    scValToNative(xdr.ScVal.fromXDR(topic, "base64")),
  );
  const value = scValToNative(xdr.ScVal.fromXDR(event.value, "base64"));
  const name = String(topics[0] ?? "Event");
  const fields = value instanceof Map
    ? Object.fromEntries([...value.entries()].map(([key, item]) => [String(key), item]))
    : value && typeof value === "object" && !Array.isArray(value) ? value : { value };
  return {
    id: event.id,
    name,
    ledger: event.ledger,
    txHash: event.txHash,
    timestamp: event.ledgerClosedAt,
    fields,
  };
}

export async function fetchEscrowActivity({ rpcUrl, contractId, cursor, startLedger, fetchImpl = fetch }) {
  const params = {
    filters: [{ type: "contract", contractIds: [contractId] }],
    pagination: { limit: 100, ...(cursor ? { cursor } : {}) },
    ...(cursor ? {} : { startLedger }),
  };

  let response;
  try {
    response = await fetchImpl(rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getEvents", params }),
    });
  } catch (cause) {
    throw new EscrowActivityError("network", "Could not reach the Stellar RPC.", { cause });
  }
  if (!response.ok) {
    throw new EscrowActivityError("http", `RPC request failed (${response.status})`, { status: response.status });
  }

  let body;
  try {
    body = await response.json();
  } catch (cause) {
    throw new EscrowActivityError("invalidResponse", "RPC returned an invalid response.", { cause });
  }
  if (body?.error) {
    throw new EscrowActivityError("rpc", body.error.message || "RPC request failed", { rpcMessage: body.error.message });
  }

  return {
    events: (body.result?.events || []).map(decodeContractEvent),
    cursor: body.result?.cursor || null,
  };
}

/** Latest ledger sequence from Soroban RPC (`getLatestLedger`). */
export async function latestLedger(rpcUrl, { fetchImpl = fetch } = {}) {
  let response;
  try {
    response = await fetchImpl(rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getLatestLedger", params: {} }),
    });
  } catch (cause) {
    throw new EscrowActivityError("network", "Could not reach the Stellar RPC.", { cause });
  }
  if (!response.ok) {
    throw new EscrowActivityError("http", `RPC request failed (${response.status})`, { status: response.status });
  }

  let body;
  try {
    body = await response.json();
  } catch (cause) {
    throw new EscrowActivityError("invalidResponse", "RPC returned an invalid response.", { cause });
  }
  if (body?.error) {
    throw new EscrowActivityError("rpc", body.error.message || "Could not read the latest ledger", {
      rpcMessage: body.error.message,
    });
  }

  const sequence = Number(body?.result?.sequence);
  if (!Number.isInteger(sequence) || sequence <= 0) {
    throw new EscrowActivityError("invalidLedger", "RPC returned an invalid latest ledger.");
  }
  return sequence;
}

export function eventMatchesInvoice(event, invoiceId) {
  return Object.values(event.fields).some((value) => String(value) === String(invoiceId));
}

function defaultTimerApi() {
  return {
    setTimer: (fn, ms) => setTimeout(fn, ms),
    clearTimer: (id) => clearTimeout(id),
  };
}

/**
 * Cursor-based polling for live escrow events.
 *
 * Fetches pages through `fetchPage({ cursor })`, which must resolve to
 * `{ events, cursor }`. Only events whose stable RPC `id` has not been seen are
 * delivered to `onEvents`. Failures use capped exponential backoff with jitter,
 * polling pauses while the document is hidden, and requests never overlap.
 */
export function createActivityPoller({
  fetchPage,
  intervalMs = 15000,
  now = () => Date.now(),
  setTimer,
  clearTimer,
  doc = typeof document !== "undefined" ? document : null,
  random = Math.random,
  baseBackoffMs = 1000,
  maxBackoffMs = 60000,
  onEvents = () => {},
  onError = () => {},
  onStatus = () => {},
} = {}) {
  if (typeof fetchPage !== "function") {
    throw new TypeError("createActivityPoller requires a fetchPage function");
  }
  const timers = defaultTimerApi();
  const scheduleTimer = setTimer || timers.setTimer;
  const cancelTimer = clearTimer || timers.clearTimer;

  const seen = new Set();
  let cursor = null;
  let timer = null;
  let running = false;
  let paused = false;
  let inFlight = false;
  let failures = 0;
  let lastUpdated = null;

  const isHidden = () => Boolean(doc && doc.visibilityState === "hidden");

  function clearScheduled() {
    if (timer === null) return;
    cancelTimer(timer);
    timer = null;
  }

  function schedule(delayMs) {
    clearScheduled();
    if (!running || paused) return;
    timer = scheduleTimer(() => {
      timer = null;
      tick();
    }, delayMs);
  }

  function backoffDelay() {
    const base = Math.min(maxBackoffMs, baseBackoffMs * 2 ** Math.max(0, failures - 1));
    return Math.min(maxBackoffMs, Math.round(base * (0.5 + random() * 0.5)));
  }

  function onVisibilityChange() {
    if (!running) return;
    if (isHidden()) {
      paused = true;
      clearScheduled();
      return;
    }
    if (paused) {
      paused = false;
      tick();
    }
  }

  async function tick() {
    if (!running || paused || inFlight) return false;
    inFlight = true;
    try {
      const page = await fetchPage({ cursor });
      if (!running) return false;

      if (page && typeof page.cursor === "string" && page.cursor) cursor = page.cursor;
      const events = Array.isArray(page?.events) ? page.events : [];
      const fresh = [];
      for (const event of events) {
        const id = event?.id;
        if (typeof id === "string" && id) {
          if (seen.has(id)) continue;
          seen.add(id);
        }
        fresh.push(event);
      }

      failures = 0;
      lastUpdated = now();
      if (fresh.length) onEvents(fresh);
      onStatus({ state: "ready", cursor, lastUpdated, received: events.length, fresh: fresh.length });
      schedule(intervalMs);
      return true;
    } catch (error) {
      if (!running) return false;
      failures += 1;
      const retryInMs = backoffDelay();
      onError(error, { failures, retryInMs });
      schedule(retryInMs);
      return false;
    } finally {
      inFlight = false;
    }
  }

  function start() {
    if (running) return;
    running = true;
    paused = isHidden();
    doc?.addEventListener?.("visibilitychange", onVisibilityChange);
    if (!paused) tick();
  }

  function stop() {
    running = false;
    paused = false;
    clearScheduled();
    doc?.removeEventListener?.("visibilitychange", onVisibilityChange);
  }

  return {
    start,
    stop,
    pollNow: () => tick(),
    getCursor: () => cursor,
    isRunning: () => running,
    isPaused: () => paused,
    getLastUpdated: () => lastUpdated,
    getFailureCount: () => failures,
  };
}
