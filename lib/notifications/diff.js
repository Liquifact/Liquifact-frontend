// Pure change detection for followed invoices.
// No DOM, no framework dependencies - safe to import in plain node:test.

// Thresholds (in percent funded) at which a "progress" event is emitted.
const THRESHOLDS = [25, 50, 75, 100];

// Computes the funded percentage of an invoice, clamped to 0-100.
export function fundedPercentOf(invoice) {
  if (!invoice || !invoice.amount) return 0;
  return Math.max(0, Math.min(100, Math.round((invoice.fundedAmount / invoice.amount) * 100)));
}

/**
 * Diff a previous snapshot against the current invoice list, limited to followed invoices.
 *
 * @param {Object} prevSnapshot - map of invoice id -> invoice (previous poll)
 * @param {Array} current - array of invoices from listInvoices()
 * @param {Array|Set} followedIds - ids the user follows
 * @returns {Array<{id, type:"funded"|"settled"|"cancelled"|"progress", from, to, at}>}
 */
export function diffInvoices(prevSnapshot, current, followedIds) {
  const followed = new Set(followedIds);
  const currentById = new Map();
  for (const inv of current) currentById.set(inv.id, inv);

  const events = [];
  const at = new Date().toISOString();

  // Followed invoices still present: detect status and funding progress changes.
  for (const id of followed) {
    const prev = prevSnapshot && prevSnapshot[id];
    const curr = currentById.get(id);
    if (!prev || !curr) continue;

    const statusChanged = prev.status !== curr.status;
    let statusEvent = null;
    if (statusChanged) {
      if (curr.status === "funded") {
        statusEvent = { id, type: "funded", from: prev.status, to: curr.status, at };
      } else if (curr.status === "settled") {
        statusEvent = { id, type: "settled", from: prev.status, to: curr.status, at };
      } else if (curr.status === "cancelled") {
        statusEvent = { id, type: "cancelled", from: prev.status, to: curr.status, at };
      }
    }

    const prevPct = fundedPercentOf(prev);
    const currPct = fundedPercentOf(curr);
    const crossed = THRESHOLDS.filter((t) => prevPct < t && t <= currPct);

    if (statusEvent) {
      // A status transition subsumes the progress milestone for this poll.
      events.push(statusEvent);
    } else if (crossed.length > 0) {
      events.push({ id, type: "progress", from: prev.status, to: curr.status, at });
    }
  }

  // Followed invoices that disappeared from the list.
  for (const id of followed) {
    if (currentById.has(id)) continue;
    const prev = prevSnapshot && prevSnapshot[id];
    if (!prev) continue;
    events.push({ id, type: "cancelled", from: prev.status, to: "removed", at });
  }

  return events;
}

/**
 * Format a timestamp into a relative time string (e.g. "5 minutes ago").
 */
export function relativeTime(at) {
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) return "";
  const now = Date.now();
  const secs = Math.floor((now - d.getTime()) / 1000);
  if (secs < 1) return "just now";
  if (secs < 60) return `${secs} second${secs === 1 ? "" : "s"} ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}
