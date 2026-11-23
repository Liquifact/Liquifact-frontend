// Injectable invoice-polling monitor.
// Pure logic: no direct DOM or global timer access - all dependencies are injected
// so it can be unit-tested with fake timers and a mock document.

import { diffInvoices } from "./diff.js";

const DEFAULT_INTERVAL_MS = 60000;
const MAX_INTERVAL_MS = 5 * 60 * 1000;
const JITTER_RATIO = 0.2;

/**
 * Merge events from multiple sources, deduplicating by chainEventId (on-chain
 * events) or by id+type for API-derived events.  Chain events take precedence
 * over API events with the same logical key so the richer on-chain timestamp
 * is kept.
 *
 * @param {Array} apiEvents    — events from diffInvoices
 * @param {Array} chainEvents  — events from chainSource.poll()
 * @returns {Array}
 */
function mergeEvents(apiEvents, chainEvents) {
  // Index chain events by chainEventId (dedupe exact RPC events) and by
  // id+type so they suppress the matching API diff event.
  const chainById = new Map();         // chainEventId -> event
  const chainByKey = new Set();        // "invoiceId:type"
  for (const e of chainEvents) {
    if (e.chainEventId) chainById.set(e.chainEventId, e);
    chainByKey.add(`${e.id}:${e.type}`);
  }

  // Keep API events that have no on-chain counterpart.
  const merged = apiEvents.filter((e) => !chainByKey.has(`${e.id}:${e.type}`));

  // Add deduplicated chain events.
  for (const e of chainById.values()) merged.push(e);

  return merged;
}

/**
 * Create a monitor that polls listInvoices(), optionally queries on-chain
 * sources, diffs/merges events, and dispatches them through an optional
 * callback.
 *
 * @param {Object} options
 * @param {Function} options.listInvoices - returns { data: invoice[] }
 * @param {Object} options.store - notification store (getSnapshot, addEvent, replaceSnapshot, getFollowed)
 * @param {Array}  [options.sources=[]] - additional event sources with a .poll(followedIds) method
 * @param {Function} [options.now=Date.now] - current time (injectable)
 * @param {Function} [options.setTimeout] - defaults to global setTimeout
 * @param {Function} [options.clearTimeout] - defaults to global clearTimeout
 * @param {Function} [options.random=Math.random] - injectable source for jitter in [0, 1)
 * @param {Object} [options.document] - defaults to global document
 * @param {number} [options.intervalMs=60000] - initial poll interval
 */
export function createInvoiceMonitor({
  listInvoices,
  store,
  sources = [],
  now = Date.now,
  setTimeout = typeof globalThis !== "undefined" ? globalThis.setTimeout : null,
  clearTimeout = typeof globalThis !== "undefined" ? globalThis.clearTimeout : null,
  random = Math.random,
  document = typeof globalThis !== "undefined" ? globalThis.document : null,
  intervalMs = DEFAULT_INTERVAL_MS,
} = {}) {
  let timer = null;
  let running = false;
  let failures = 0;
  let nextDelayMs = intervalMs;
  let pollPromise = null;
  let onEvent = () => {};

  function isVisible() {
    return !!(document && document.visibilityState === "visible");
  }

  function shouldPoll() {
    return isVisible() && store.getFollowed().size > 0;
  }

  function getNextDelay() {
    const baseDelay = Math.min(intervalMs * (2 ** failures), MAX_INTERVAL_MS);
    const jitter = 1 - JITTER_RATIO + (random() * JITTER_RATIO * 2);
    return Math.min(MAX_INTERVAL_MS, Math.round(baseDelay * jitter));
  }

  function scheduleNext() {
    if (!running || !shouldPoll() || !setTimeout) return;
    if (timer !== null && clearTimeout) clearTimeout(timer);
    nextDelayMs = getNextDelay();
    timer = setTimeout(() => {
      timer = null;
      poll();
    }, nextDelayMs);
  }

  function start() {
    stop();
    if (shouldPoll()) {
      running = true;
      scheduleNext();
    }
  }

  function stop() {
    running = false;
    if (timer !== null && clearTimeout) {
      clearTimeout(timer);
      timer = null;
    }
  }

  function setOnEvent(fn) {
    onEvent = fn || (() => {});
  }

  async function poll() {
    if (pollPromise) return pollPromise;
    if (store.getFollowed().size === 0) {
      stop();
      return;
    }

    pollPromise = (async () => {
      try {
        const followed = store.getFollowed();

        // --- API source (required) ---
        const res = await listInvoices();
        if (res && res.offline) throw new Error("Invoice list is offline");
        const current = (res && res.data) || [];
        failures = 0;

        const prevSnapshot = store.getSnapshot();
        const apiEvents = diffInvoices(prevSnapshot, current, followed);

        // --- Additional sources (best-effort; individual failures don't fail the poll) ---
        let chainEvents = [];
        for (const source of sources) {
          try {
            const sourced = await source.poll(followed);
            if (Array.isArray(sourced)) chainEvents = chainEvents.concat(sourced);
          } catch {
            // Source failure is non-fatal — API poll already succeeded.
          }
        }

        // --- Merge and deduplicate ---
        const events = mergeEvents(apiEvents, chainEvents);

        store.replaceSnapshot(current);
        for (const event of events) store.addEvent(event);
        for (const event of events) onEvent(event);
      } catch {
        failures += 1;
      } finally {
        pollPromise = null;
        if (running && !shouldPoll()) stop();
        else scheduleNext();
      }
    })();

    return pollPromise;
  }

  // Respond to visibility changes: poll + restart when visible, pause when hidden.
  function onVisibilityChange() {
    if (isVisible()) {
      poll();
      start();
    } else {
      stop();
    }
  }

  // Refresh once when the window regains focus.
  function onFocus() {
    poll();
  }

  return {
    start,
    stop,
    poll,
    shouldPoll,
    isVisible,
    onVisibilityChange,
    onFocus,
    setOnEvent,
    getStatus() {
      return { failures, nextDelayMs };
    },
  };
}
