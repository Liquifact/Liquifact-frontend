// Injectable invoice-polling monitor.
// Pure logic: no direct DOM or global timer access - all dependencies are injected
// so it can be unit-tested with fake timers and a mock document.

import { diffInvoices } from "./diff.js";

const DEFAULT_INTERVAL_MS = 60000;

/**
 * Create a monitor that polls listInvoices(), diffs against the store snapshot,
 * and dispatches new events through an optional callback.
 *
 * @param {Object} options
 * @param {Function} options.listInvoices - returns { data: invoice[] }
 * @param {Object} options.store - notification store (getSnapshot, addEvent, replaceSnapshot, getFollowed)
 * @param {Function} [options.now=Date.now] - current time (injectable)
 * @param {Function} [options.setInterval] - defaults to global setInterval
 * @param {Function} [options.clearInterval] - defaults to global clearInterval
 * @param {Object} [options.document] - defaults to global document
 * @param {number} [options.intervalMs=60000] - poll interval
 */
export function createInvoiceMonitor({
  listInvoices,
  store,
  now = Date.now,
  setInterval = typeof globalThis !== "undefined" ? globalThis.setInterval : null,
  clearInterval = typeof globalThis !== "undefined" ? globalThis.clearInterval : null,
  document = typeof globalThis !== "undefined" ? globalThis.document : null,
  intervalMs = DEFAULT_INTERVAL_MS,
} = {}) {
  let timer = null;
  let onEvent = () => {};

  function isVisible() {
    return !!(document && document.visibilityState === "visible");
  }

  function shouldPoll() {
    return isVisible() && store.getFollowed().size > 0;
  }

  function start() {
    stop();
    if (shouldPoll()) {
      timer = setInterval(poll, intervalMs);
    }
  }

  function stop() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  function setOnEvent(fn) {
    onEvent = fn || (() => {});
  }

  async function poll() {
    if (store.getFollowed().size === 0) {
      stop();
      return;
    }

    let current = [];
    try {
      const res = await listInvoices();
      current = (res && res.data) || [];
    } catch {
      current = [];
    }

    const prevSnapshot = store.getSnapshot();
    const events = diffInvoices(prevSnapshot, current, store.getFollowed());
    for (const event of events) store.addEvent(event);
    store.replaceSnapshot(current);
    for (const event of events) onEvent(event);
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
  };
}
