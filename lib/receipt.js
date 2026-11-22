import { CONTRACT_ID, EXPLORER_URL, NETWORK } from "./config.js";
import { bpsToPercent, formatAmount, formatDate } from "./format.js";
import { formatStroops, parseToStroops } from "./stellar/amount.js";

const HEX_64 = /^[0-9a-fA-F]{64}$/;

/**
 * Build a safe, deterministic filename for a funding receipt.
 * @param {Object} params
 * @param {string} [params.invoiceId]
 * @param {string} [params.hash]
 * @returns {string}
 */
export function receiptFilename({ invoiceId = "invoice", hash = "" } = {}) {
  const safeId = String(invoiceId || "invoice")
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "invoice";
  const shortHash = typeof hash === "string" && hash.length >= 8 ? hash.slice(0, 8).toLowerCase() : "tx";
  return `liquifact-receipt-${safeId}-${shortHash}.pdf`;
}

function toIsoTimestamp(value, fallback) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? fallback : value.toISOString();
  }
  if (typeof value === "number" || typeof value === "string") {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return fallback;
}

function resolveAmountStroops(amountStroops, tx) {
  if (amountStroops !== undefined && amountStroops !== null && amountStroops !== "") {
    if (typeof amountStroops === "bigint") return amountStroops > 0n ? amountStroops : null;
    if (typeof amountStroops === "number" && Number.isInteger(amountStroops) && amountStroops > 0) {
      return BigInt(amountStroops);
    }
    if (typeof amountStroops === "string" && /^\d+$/.test(amountStroops.trim())) {
      const v = BigInt(amountStroops.trim());
      return v > 0n ? v : null;
    }
  }
  if (tx?.amountStroops !== undefined && tx?.amountStroops !== null) {
    return resolveAmountStroops(tx.amountStroops, null);
  }
  // Fallback: extract decimal amount from label like "Fund INV_0001 (250 USDC)"
  if (typeof tx?.label === "string") {
    const match = tx.label.match(/\(([\d.]+)\s+[A-Za-z0-9]+\)/);
    if (match) {
      const parsed = parseToStroops(match[1]);
      if (parsed && parsed > 0n) return parsed;
    }
  }
  return null;
}

function buildExplorerUrl(hash, network) {
  if (!network || network === NETWORK) {
    const base = EXPLORER_URL.replace(`/contract/${CONTRACT_ID}`, "");
    return `${base}/tx/${hash}`;
  }
  return `https://stellar.expert/explorer/${encodeURIComponent(network)}/tx/${hash}`;
}

/**
 * Build a plain, serializable funding receipt from a confirmed local tx store entry
 * and its matching invoice. Returns null for unknown, unconfirmed, or foreign hashes.
 *
 * @param {Object} params
 * @param {Object|null} params.tx - Transaction entry from txStore
 * @param {Object|null} params.invoice - Invoice record
 * @param {string|null} [params.investor] - Investor Stellar public key
 * @param {bigint|string|number|null} [params.amountStroops] - Contribution amount in stroops
 * @param {string} [params.network] - Stellar network name (defaults to config NETWORK)
 * @param {Date|number|string} [params.now] - Current timestamp for issuedAt
 * @returns {Object|null}
 */
export function buildReceipt({ tx, invoice, investor = null, amountStroops = null, network = NETWORK, now = new Date() } = {}) {
  if (!tx || typeof tx !== "object") return null;
  if (!invoice || typeof invoice !== "object" || !invoice.id) return null;
  if (typeof tx.hash !== "string" || !HEX_64.test(tx.hash)) return null;
  if (tx.status !== "SUCCESS") return null;
  // Never render a receipt if the transaction belongs to a different invoice or has no invoiceId.
  if (!tx.invoiceId || tx.invoiceId !== invoice.id) return null;

  const currency = invoice.currency || "USDC";
  const resolvedNetwork = network || NETWORK;
  const issuedAt = toIsoTimestamp(now, new Date().toISOString());
  const confirmedAt = toIsoTimestamp(tx.updatedAt ?? tx.createdAt, issuedAt);
  const stroops = resolveAmountStroops(amountStroops, tx);

  return {
    hash: tx.hash,
    shortHash: `${tx.hash.slice(0, 8)}…${tx.hash.slice(-8)}`,
    invoiceId: invoice.id,
    sme: invoice.sme || "",
    debtor: invoice.debtor || "",
    currency,
    faceValue: formatAmount(invoice.amount, currency),
    yieldBps: invoice.yieldBps ?? null,
    yieldPercent: bpsToPercent(invoice.yieldBps),
    dueDate: invoice.dueDate || "",
    dueDateFormatted: formatDate(invoice.dueDate),
    investor: investor || tx.investor || null,
    amountStroops: stroops !== null ? stroops.toString() : null,
    amountFormatted: stroops !== null ? formatStroops(stroops, currency) : null,
    network: resolvedNetwork,
    explorerUrl: buildExplorerUrl(tx.hash, resolvedNetwork),
    status: tx.status,
    label: tx.label || "",
    confirmedAt,
    issuedAt,
    filename: receiptFilename({ invoiceId: invoice.id, hash: tx.hash }),
  };
}
