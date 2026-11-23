// Injectable invoice-polling monitor.
// Pure logic: no direct DOM or global timer access - all dependencies are injected
// so it can be unit-tested with fake timers and a mock document.

import { diffInvoices } from "./diff.js";

const DEFAULT_INTERVAL_MS = 60000;
const MAX_INTERVAL_MS = 5 * 60 * 1000;
const JITTER_RATIO = 0.2;

/**
 * Create a monitor that polls listInvoices(), diffs against the store snapshot,
 * and dispatches new events through an optional callback.
 *
 * @param {Object} options
 * @param {Function} options.listInvoices - returns { data: invoice[] }
 * @param {Object} options.store - notification store (getSnapshot, addEvent, replaceSnapshot, getFollowed)
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
        const res = await listInvoices();
        if (res && res.offline) throw new Error("Invoice list is offline");
        const current = (res && res.data) || [];
        failures = 0;

        // Settings may have cleared followed invoices while this request awaited.
        if (store.getFollowed().size === 0) return;
        const prevSnapshot = store.getSnapshot();
        const events = diffInvoices(prevSnapshot, current, store.getFollowed());
        for (const event of events) store.addEvent(event);
        store.replaceSnapshot(current);
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
