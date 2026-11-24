/**
 * lib/notifications/chainSource.js
 *
 * On-chain event source for the notification monitor.
 *
 * Reads Soroban contract events directly via fetchEscrowActivity for each
 * followed invoice that has a known escrow contract, translates them into the
 * same event shape produced by diffInvoices, and persists a per-contract
 * cursor in the notification store so duplicates are never re-emitted.
 *
 * Injected dependencies (all required):
 *   - fetchEscrowActivity  — from lib/escrow-activity.js (or a test stub)
 *   - escrowFor            — from lib/escrow/registry.js  (or a test stub)
 *   - store                — notification store (getChainCursors, setChainCursor)
 *   - rpcUrl               — Soroban RPC endpoint string
 *   - startLedger          — ledger to begin from when no cursor is stored
 */

// Contract event names that we surface as notifications.
const EVENT_TYPE_MAP = {
  fund: "progress",
  funded: "funded",
  settle: "settled",
  settled: "settled",
  refund: "refunded",
  refunded: "refunded",
};

/**
 * Map a decoded contract event name to a notification event type, or null if
 * the event should be ignored.
 *
 * @param {string} name
 * @returns {string|null}
 */
function toNotificationType(name) {
  return EVENT_TYPE_MAP[String(name).toLowerCase()] ?? null;
}

/**
 * Extract the invoice id from a decoded event's fields.
 * Looks for common field names used in the LiquiFact contract.
 *
 * @param {Record<string, unknown>} fields
 * @returns {string|null}
 */
function extractInvoiceId(fields) {
  const candidates = ["invoice_id", "invoiceId", "id"];
  for (const key of candidates) {
    if (fields[key] !== undefined && fields[key] !== null) {
      return String(fields[key]);
    }
  }
  return null;
}

/**
 * Create a chain-event source that can be passed to createInvoiceMonitor as
 * an additional source alongside the REST API.
 *
 * @param {object} options
 * @param {Function} options.fetchEscrowActivity   — (params) => Promise<{ events, cursor }>
 * @param {Function} options.escrowFor             — (invoice) => { contractId } | null
 * @param {object}   options.store                 — notification store
 * @param {string}   options.rpcUrl                — Soroban RPC URL
 * @param {number}   [options.startLedger=0]       — ledger to start from when no cursor stored
 *
 * @returns {{ poll: (followedIds: Set<string>) => Promise<Array> }}
 */
export function createChainSource({
  fetchEscrowActivity,
  escrowFor,
  store,
  rpcUrl,
  startLedger = 0,
}) {
  /**
   * Poll on-chain events for all followed invoices and return notification
   * events in the same shape as diffInvoices.
   *
   * @param {Set<string>} followedIds
   * @returns {Promise<Array<{id, type, from, to, at, chainEventId}>>}
   */
  async function poll(followedIds) {
    if (!followedIds || followedIds.size === 0) return [];

    const cursors = store.getChainCursors ? store.getChainCursors() : {};
    const at = new Date().toISOString();
    const events = [];

    // Collect unique contract ids so we only fetch each contract once even if
    // multiple followed invoices share the same escrow.
    /** @type {Map<string, string[]>} contractId -> [invoiceId, ...] */
    const contractToInvoices = new Map();
    for (const invoiceId of followedIds) {
      const result = escrowFor({ id: invoiceId });
      if (!result) continue;
      const { contractId } = result;
      const list = contractToInvoices.get(contractId) ?? [];
      list.push(invoiceId);
      contractToInvoices.set(contractId, list);
    }

    for (const [contractId, invoiceIds] of contractToInvoices) {
      const cursor = cursors[contractId];
      let page;
      try {
        page = await fetchEscrowActivity({
          rpcUrl,
          contractId,
          ...(cursor ? { cursor } : { startLedger }),
        });
      } catch {
        // RPC failed for this contract — skip it. The monitor's API fallback
        // will cover state transitions via the REST poll.
        continue;
      }

      let lastCursor = cursor ?? null;
      for (const event of page.events) {
        const type = toNotificationType(event.name);
        if (!type) continue;

        // Match the event to a followed invoice via its fields.
        const matchedId = invoiceIds.find((id) =>
          extractInvoiceId(event.fields) === id ||
          Object.values(event.fields).some((v) => String(v) === String(id)),
        );
        if (!matchedId) continue;

        events.push({
          id: matchedId,
          type,
          from: "on-chain",
          to: type,
          at: event.timestamp ?? at,
          chainEventId: event.id,
        });
      }

      // Advance the cursor even if no matching events were found — this avoids
      // re-scanning the same ledger range on the next poll.
      if (page.cursor && page.cursor !== cursor) {
        lastCursor = page.cursor;
      }
      if (lastCursor && lastCursor !== cursor && store.setChainCursor) {
        store.setChainCursor(contractId, lastCursor);
      }
    }

    return events;
  }

  return { poll };
}
