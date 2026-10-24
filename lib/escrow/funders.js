// Load and summarise per-investor funding records from the escrow contract.
import { CONTRACT_ID } from "../config.js";
import { simulateCall, u32Arg } from "../stellar/rpc.js";

export const DEFAULT_PAGE_SIZE = 10;

/**
 * Load one page of funding records from the escrow.
 * Calls get_unique_funder_count() first; when the count is 0 the records
 * getter is never called (empty ledger pages are invalid on-chain).
 *
 * @param {object} opts
 * @param {string} [opts.contractId]
 * @param {number} [opts.page] - 1-based page number
 * @param {number} [opts.pageSize]
 * @param {function} [opts.call] - injected simulate helper (tests)
 * @returns {Promise<{records: Array<[string, string]>, totalCount: number, page: number, pageSize: number, pageCount: number}>}
 *   records are [funderAddress, amountStroopsAsString] pairs.
 */
export async function loadFunders({ contractId = CONTRACT_ID, page = 1, pageSize = DEFAULT_PAGE_SIZE, call = simulateCall } = {}) {
  const safePage = Math.max(1, Math.trunc(page) || 1);
  const size = Math.max(1, Math.trunc(pageSize) || DEFAULT_PAGE_SIZE);
  const totalCount = Number(await call({ contractId, method: "get_unique_funder_count" })) || 0;
  const pageCount = Math.max(1, Math.ceil(totalCount / size));
  const clampedPage = Math.min(safePage, pageCount);
  if (totalCount === 0) {
    return { records: [], totalCount, page: clampedPage, pageSize: size, pageCount };
  }
  const start = (clampedPage - 1) * size;
  const raw = await call({ contractId, method: "get_funding_records", args: [u32Arg(start), u32Arg(size)] });
  const records = (Array.isArray(raw) ? raw : []).map((entry) => {
    const [address, amount] = Array.isArray(entry) ? entry : [entry?.[0], entry?.[1]];
    return [String(address), typeof amount === "bigint" ? amount.toString() : String(amount ?? "0")];
  });
  return { records, totalCount, page: clampedPage, pageSize: size, pageCount };
}

/**
 * Pure summary: rows with share percentages plus a concentration reading.
 * BigInt maths throughout; sharePct is a string with 2 decimal places.
 *
 * @param {Array<[string, string]>} records - [address, amountStroops] pairs
 * @param {string|bigint} total - total funded stroops (defaults to record sum)
 */
export function summariseFunders(records, total) {
  const rows = (records || []).map(([address, amount]) => ({ address, amount: BigInt(amount || 0) }));
  const sum = total !== undefined && total !== null ? BigInt(total) : rows.reduce((acc, r) => acc + r.amount, 0n);
  const withShares = rows.map((r) => ({
    ...r,
    // basis points with 2dp of a percent: amount * 10000 / total
    sharePct: sum > 0n ? Number((r.amount * 10000n) / sum) / 100 : 0,
  }));
  const topShare = withShares.reduce((max, r) => (r.sharePct > max ? r.sharePct : max), 0);
  const concentration = topShare > 50 ? "high" : topShare >= 25 ? "medium" : "low";
  return { rows: withShares, total: sum, topShare, concentration };
}
