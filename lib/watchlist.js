// Pure watchlist view-model builder for followed invoices.
// No DOM or framework dependencies - safe to import in plain node:test.

import { fundedPercentOf } from "./notifications/diff.js";

/**
 * Build watchlist rows for every followed invoice, combining current API data
 * with the stored notification snapshot to compute funded-percent deltas and
 * flag invoices missing from the API as "unavailable".
 *
 * Preserves the order of `followedIds` (deduplicated).
 *
 * @param {Object} params
 * @param {Iterable<string>} [params.followedIds] - followed invoice IDs
 * @param {Array<Object>} [params.invoices] - current invoices from listInvoices()
 * @param {Object} [params.snapshot] - map of invoice id -> previous invoice snapshot
 * @returns {Array<Object>}
 */
export function buildWatchlist({ followedIds = [], invoices = [], snapshot = {} } = {}) {
  const invoiceById = new Map();
  if (Array.isArray(invoices)) {
    for (const inv of invoices) {
      if (inv && inv.id) invoiceById.set(inv.id, inv);
    }
  }

  const seen = new Set();
  const rows = [];

  for (const id of followedIds || []) {
    if (!id || seen.has(id)) continue;
    seen.add(id);

    const current = invoiceById.get(id) || null;
    const prev = (snapshot && snapshot[id]) || null;
    const prevFundedPercent = prev ? fundedPercentOf(prev) : null;
    const prevStatus = prev?.status ?? null;

    if (!current) {
      rows.push({
        id,
        available: false,
        status: "unavailable",
        prevStatus,
        statusChanged: false,
        fundedPercent: null,
        prevFundedPercent,
        fundedDelta: null,
        invoice: null,
        previous: prev,
      });
      continue;
    }

    const fundedPercent = fundedPercentOf(current);
    const fundedDelta = prevFundedPercent === null ? null : fundedPercent - prevFundedPercent;
    const status = current.status || "unknown";
    const statusChanged = Boolean(prevStatus && prevStatus !== status);

    rows.push({
      id,
      available: true,
      status,
      prevStatus,
      statusChanged,
      fundedPercent,
      prevFundedPercent,
      fundedDelta,
      invoice: current,
      previous: prev,
    });
  }

  return rows;
}
