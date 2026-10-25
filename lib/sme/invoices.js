/**
 * Pure helpers for the SME dashboard.
 *
 * This module is deliberately free of JSX, next/ aliases and DOM
 * dependencies so it can be imported directly by `node:test`.
 */

const STATUS_LABELS = {
  open: "Awaiting investors",
  funded: "Funded",
  settled: "Completed",
  cancelled: "Cancelled",
};

/**
 * Normalise a status value coming from the API / demo data.
 * Matches the backend enum (`open`, `funded`, `settled`, `cancelled`).
 */
function normaliseStatus(invoice) {
  const raw = (invoice && invoice.status) || "open";
  const status = String(raw).toLowerCase();
  if (status === "funded" || status === "settled" || status === "cancelled") {
    return status;
  }
  return "open";
}

/**
 * Convert a value to a number, falling back to 0 for null / undefined / NaN.
 */
function toNumber(value) {
  const num = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(num) ? num : 0;
}

/**
 * Return true when two stellar addresses are an exact strkey match.
 */
function sameAddress(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length === 0 || b.length === 0) return false;
  return a === b;
}

/**
 * Select invoices that belong to the SME.
 *
 * An invoice is included when either:
 *   - its `smeAddress` exactly matches the connected wallet address, by
 *   - its `id` appears in the list of ids created in this browser.
 *
 * Each returned invoice is tagged with `source`:
 *   - "wallet"  when the wallet address matches,
 *   - "browser" when it was only found via local ids.
 *
 * When an invoice matches both, it is reported as "wallet" (stronger
 * identity). Duplicates are collapsed by `id`.
 *
 * @param {Array<object>} all
 * @param {{address?: string, localIds?: Array<string>}} options
 * @returns {Array<object>}
 */
export function selectSmeInvoices(all, options = {}) {
  const invoices = Array.isArray(all) ? all : [];
  const address = options.address;
  const localIds = Array.isArray(options.localIds) ? options.localIds : [];
  const localSet = new Set(localIds.map((id) => String(id)));

  const seen = new Set();
  const result = [];

  for (const invoice of invoices) {
    if (!invoice || typeof invoice !== "object") continue;
    const id = invoice.id == null ? "" : String(invoice.id);
    const walletMatch = sameAddress(invoice.smeAddress, address);
    const browserMatch = id !== "" && localSet.has(id);
    if (!walletMatch && !browserMatch) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    result.push({
      ...invoice,
      source: walletMatch ? "wallet" : "browser",
    });
  }

  return result;
}

/**
 * Determine the next action for an invoice.
 *
 * Rules:
 *   - open                        -> "Awaiting investors"
 *   - funded, due soon (<= 7 days) -> "Settle at maturity"
 *   - funded, otherwise          -> "Withdraw available"
 *   - settled                     -> "Completed"
 *   - cancelled                    -> "Cancelled"
 *
 * @param {object} invoice
 * @param {number} [now] current timestamp (ms), defaults to Date.now()
 * @returns {string}
 */
export function nextActionFor(invoice, now = Date.now()) {
  const status = normaliseStatus(invoice);
  if (status === "settled") return "Completed";
  if (status === "cancelled") return "Cancelled";
  if (status === "open") return "Awaiting investors";

  // funded
  const due = invoice && invoice.dueDate != null ? Date.parse(invoice.dueDate) : NaN;
  if (Number.isFinite(due)) {
    const seven_days = 7 * 24 * 60 * 60 * 1000;
    if (due - now <= seven_days) return "Settle at maturity";
  }
  return "Withdraw available";
}

/**
 * Summarise a list of invoices for the SME dashboard.
 *
 * Returns:
 *   {
 *     totalsByCurrency: { [currency]: { faceValue, raised, outstanding } },
 *     countsByStatus: { open, funded, settled, cancelled },
 *     totalInvoices: number,
 *     nextActionById: { [id]: string },
 *   }
 *
 * `faceValue` is the invoice amount, `raised` is the funded amount,
 * `outstanding` is faceValue - raised (clamped to >= 0).
 *
 * @param {Array<object>} invoices
 * @param {number} [now]
 * @returns object
 */
export function smeSummary(invoices, now = Date.now()) {
  const list = Array.isArray(invoices) ? invoices : [];
  const totalsByCurrency = {};
  const countsByStatus = { open: 0, funded: 0, settled: 0, cancelled: 0 };
  const nextActionById = {};

  for (const invoice of list) {
    if (!invoice || typeof invoice !== "object") continue;
    const currency = invoice.currency || "XET";
    if (!totalsByCurrency[currency]) {
      totalsByCurrency[currency] = { faceValue: 0, raised: 0, outstanding: 0 };
    }
    const faceValue = toNumber(invoice.amount);
    const raised = toNumber(invoice.fundedAmount);
    const outstanding = Math.max(0, faceValue - raised);
    totalsByCurrency[currency].faceValue += faceValue;
    totalsByCurrency[currency].raised += raised;
    totalsByCurrency[currency].outstanding += outstanding;

    const status = normaliseStatus(invoice);
    countsByStatus[status] += 1;

    const id = invoice.id == null ? "" : String(invoice.id);
    if (id !== "") {
      nextActionById[id] = nextActionFor(invoice, now);
    }
  }

  return {
    totalsByCurrency,
    countsByStatus,
    totalInvoices: list.length,
    nextActionById,
  };
}

/**
 * Human-readable label for a status value.
 */
export function statusLabel(status) {
  const key = String(status || "").toLowerCase();
  return STATUS_LABELS[key] || STATUS_LABELS.open;
}

export const SME_INVOICES_STORAGE_KEY = "liquifact-sme-invoices";
