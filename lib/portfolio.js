// Investor portfolio aggregation (#1461).
// Pure and dependency-light so `node --test` can import it directly.
import { DECIMALS, add, parse } from "./money.js";

/** Exit states a portfolio row can be in, derived from invoice status + refund flag. */
export const EXIT_STATUS = Object.freeze({
  ACTIVE: "active", // escrow open/funded, capital still at work
  SETTLED: "settled", // escrow settled or withdrawn, position closed out
  REFUNDABLE: "refundable", // escrow cancelled, refund not yet claimed
  REFUNDED: "refunded", // escrow cancelled, refund already claimed
});

function lookup(source, id) {
  if (!source) return undefined;
  if (source instanceof Map) return source.get(id);
  return Object.prototype.hasOwnProperty.call(source, id) ? source[id] : undefined;
}

function isError(value) {
  return value instanceof Error || (value !== null && typeof value === "object" && "error" in value);
}

/** Normalise a contribution reading (stroops) to BigInt minor units, or null when unusable. */
function toMinor(value) {
  if (typeof value === "bigint") return value >= 0n ? value : null;
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) return BigInt(value);
  if (typeof value === "string" && /^\d+$/.test(value)) return parse(value, "XLM", { minor: true });
  return null;
}

/** Map an invoice status and refund flag to an exit status. */
export function exitStatusFor(status, refunded) {
  if (status === "cancelled") return refunded ? EXIT_STATUS.REFUNDED : EXIT_STATUS.REFUNDABLE;
  if (status === "settled" || status === "withdrawn") return EXIT_STATUS.SETTLED;
  return EXIT_STATUS.ACTIVE;
}

/**
 * Build portfolio rows and per-currency totals for a connected investor.
 *
 * @param {object} input
 * @param {Array<object>} input.invoices - invoices from `listInvoices()`
 * @param {Record<string, bigint|string|number|Error|{error: unknown}>|Map} input.contributions
 *   contribution per invoice id in minor units (stroops). An `Error` (or `{ error }`)
 *   marks a row whose on-chain read failed; missing ids are treated as not contributed.
 * @param {Record<string, boolean>|Map} [input.refunded] - refund flag per invoice id
 * @returns {{ rows: Array<object>, totals: Array<{ currency: string, contributed: bigint, outstanding: bigint, count: number }> }}
 *   `rows` keeps invoice order and hides zero-contribution invoices; error rows are kept
 *   (so the UI can surface them) but excluded from totals. `totals` is one entry per
 *   currency, sorted by currency code, summed with lib/money.js (never floats).
 *   `outstanding` excludes refunded positions.
 */
export function buildPortfolio({ invoices, contributions, refunded } = {}) {
  const rows = [];
  const totals = new Map();
  const seen = new Set();

  for (const invoice of Array.isArray(invoices) ? invoices : []) {
    const id = invoice?.id;
    if (!id || seen.has(id)) continue;
    seen.add(id);

    const reading = lookup(contributions, id);
    if (reading === undefined || reading === null) continue;

    const currency = invoice.currency || "XLM";
    const status = invoice.status || "unknown";
    const supported = DECIMALS[currency] !== undefined;

    if (isError(reading) || !supported) {
      rows.push({ id, invoice, currency, status, contributed: null, refunded: false, exitStatus: null, error: true });
      continue;
    }

    const contributed = toMinor(reading);
    if (contributed === null) {
      rows.push({ id, invoice, currency, status, contributed: null, refunded: false, exitStatus: null, error: true });
      continue;
    }
    if (contributed === 0n) continue; // never contributed (or fully unfunded): hide

    const isRefunded = lookup(refunded, id) === true;
    rows.push({
      id,
      invoice,
      currency,
      status,
      contributed,
      refunded: isRefunded,
      exitStatus: exitStatusFor(status, isRefunded),
      error: false,
    });

    const total = totals.get(currency) || { currency, contributed: 0n, outstanding: 0n, count: 0 };
    total.contributed = add(total.contributed, contributed);
    if (!isRefunded) total.outstanding = add(total.outstanding, contributed);
    total.count += 1;
    totals.set(currency, total);
  }

  return {
    rows,
    totals: [...totals.values()].sort((a, b) => (a.currency < b.currency ? -1 : a.currency > b.currency ? 1 : 0)),
  };
}
