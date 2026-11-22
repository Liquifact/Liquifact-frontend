/**
 * lib/compare.js
 *
 * Pure helpers for parsing comparison URL parameters and building
 * side-by-side invoice comparison tables with per-row best-value flags.
 */

import { fundedPercent } from "./format.js";
import { computeListMedians, scoreInvoice } from "./risk.js";

export const MAX_COMPARE = 3;

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Parse invoice IDs from URLSearchParams, a plain object, or a query/CSV string.
 * Deduplicates preserving first-seen order and caps the result at `max`.
 *
 * @param {URLSearchParams | Record<string, string | string[]> | string | null | undefined} searchParams
 * @param {number} [max=3]
 * @returns {string[]}
 */
export function parseCompareIds(searchParams, max = MAX_COMPARE) {
  const limit = Number.isInteger(max) && max > 0 ? max : MAX_COMPARE;
  if (!searchParams) return [];

  let rawValues = [];

  if (typeof searchParams === "string") {
    const trimmed = searchParams.trim();
    if (trimmed.startsWith("?") || trimmed.includes("=")) {
      const sp = new URLSearchParams(trimmed.startsWith("?") ? trimmed.slice(1) : trimmed);
      rawValues = sp.getAll("ids");
    } else if (trimmed.length > 0) {
      rawValues = [trimmed];
    }
  } else if (typeof searchParams.getAll === "function") {
    rawValues = searchParams.getAll("ids");
  } else if (typeof searchParams.get === "function") {
    const val = searchParams.get("ids");
    if (val != null) rawValues = [val];
  } else if (typeof searchParams === "object") {
    const val = searchParams.ids;
    if (Array.isArray(val)) {
      rawValues = val;
    } else if (val != null) {
      rawValues = [String(val)];
    }
  }

  const seen = new Set();
  const result = [];

  for (const entry of rawValues) {
    if (typeof entry !== "string") continue;
    for (const part of entry.split(",")) {
      const id = part.trim();
      if (!id || seen.has(id)) continue;
      seen.add(id);
      result.push(id);
      if (result.length >= limit) return result;
    }
  }

  return result;
}

/**
 * Serialize a list of invoice IDs into a comma-separated query value.
 *
 * @param {string[]} ids
 * @param {number} [max=3]
 * @returns {string}
 */
export function serializeCompareIds(ids, max = MAX_COMPARE) {
  if (!Array.isArray(ids)) return "";
  return parseCompareIds({ ids }, max).join(",");
}

/**
 * Compute days remaining until an ISO due date relative to `nowMs`.
 * Returns `null` if the due date is missing or unparseable.
 *
 * @param {string | undefined} dueDate
 * @param {number} nowMs
 * @returns {number | null}
 */
function computeDaysToDue(dueDate, nowMs) {
  if (!dueDate) return null;
  const dueMs = new Date(dueDate).getTime();
  if (Number.isNaN(dueMs)) return null;
  return Math.ceil((dueMs - nowMs) / MS_PER_DAY);
}

/**
 * Determine which indices hold the best value for a numeric metric.
 * Returns a Set of winning indices. Returns an empty Set when ranking is
 * disabled, fewer than 2 valid values exist, or all valid values are equal.
 *
 * @param {Array<number | null>} values
 * @param {"max" | "min"} direction
 * @param {boolean} enabled
 * @returns {Set<number>}
 */
function findBestIndices(values, direction, enabled) {
  const winners = new Set();
  if (!enabled) return winners;

  const valid = [];
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (typeof v === "number" && Number.isFinite(v)) {
      valid.push({ index: i, value: v });
    }
  }

  if (valid.length < 2) return winners;

  const nums = valid.map((x) => x.value);
  const best = direction === "max" ? Math.max(...nums) : Math.min(...nums);
  const worst = direction === "max" ? Math.min(...nums) : Math.max(...nums);

  if (best === worst) return winners;

  for (const entry of valid) {
    if (entry.value === best) winners.add(entry.index);
  }
  return winners;
}

/**
 * Build a side-by-side comparison model for up to `MAX_COMPARE` invoices.
 * Best-value highlights are disabled when invoices span multiple currencies
 * or when fewer than 2 invoices are being compared.
 *
 * @param {Array<object>} invoices
 * @param {number} [nowMs=Date.now()]
 * @param {{ medianYield?: number, medianTicketSize?: number }} [mediansInput]
 */
export function buildComparison(invoices = [], nowMs = Date.now(), mediansInput) {
  const validInvoices = Array.isArray(invoices)
    ? invoices.filter((inv) => inv && typeof inv === "object" && inv.id)
    : [];

  const medians = mediansInput ?? computeListMedians(validInvoices);

  const currencies = Array.from(
    new Set(
      validInvoices
        .map((inv) => String(inv.currency || "").trim().toUpperCase())
        .filter(Boolean),
    ),
  );
  const mixedCurrencies = currencies.length > 1;
  const canRank = !mixedCurrencies && validInvoices.length >= 2;

  const items = validInvoices.map((inv) => {
    const amount = Number(inv.amount) || 0;
    const fundedAmount = Number(inv.fundedAmount) || 0;
    const remainingCapacity = Math.max(0, amount - fundedAmount);
    const yieldBps = Number(inv.yieldBps);
    const yieldPct = Number.isFinite(yieldBps) ? yieldBps / 100 : null;
    const daysToDue = computeDaysToDue(inv.dueDate, nowMs);
    const fundedPct = fundedPercent(inv);
    const risk = scoreInvoice(inv, nowMs, medians);

    return {
      id: inv.id,
      invoice: inv,
      currency: String(inv.currency || "USDC").trim().toUpperCase(),
      yieldPct,
      daysToDue,
      remainingCapacity,
      fundedPct,
      riskScore: risk.score,
      riskBand: risk.band,
      riskFactors: risk.factors,
    };
  });

  const bestYield = findBestIndices(
    items.map((it) => it.yieldPct),
    "max",
    canRank,
  );

  // For tenor (days to due), only non-negative (non-overdue) invoices are eligible for "best" (shortest tenor).
  const bestTenor = findBestIndices(
    items.map((it) => (it.daysToDue !== null && it.daysToDue >= 0 ? it.daysToDue : null)),
    "min",
    canRank,
  );

  const bestCapacity = findBestIndices(
    items.map((it) => (it.remainingCapacity > 0 ? it.remainingCapacity : null)),
    "max",
    canRank,
  );

  const bestRisk = findBestIndices(
    items.map((it) => it.riskScore),
    "min",
    canRank,
  );

  const rows = [
    {
      key: "yield",
      label: "Yield",
      cells: items.map((it, idx) => ({
        id: it.id,
        value: it.yieldPct,
        best: bestYield.has(idx),
      })),
    },
    {
      key: "daysToDue",
      label: "Days to due",
      cells: items.map((it, idx) => ({
        id: it.id,
        value: it.daysToDue,
        best: bestTenor.has(idx),
      })),
    },
    {
      key: "remainingCapacity",
      label: "Remaining capacity",
      cells: items.map((it, idx) => ({
        id: it.id,
        value: it.remainingCapacity,
        best: bestCapacity.has(idx),
      })),
    },
    {
      key: "riskBand",
      label: "Risk band",
      cells: items.map((it, idx) => ({
        id: it.id,
        value: it.riskBand,
        score: it.riskScore,
        best: bestRisk.has(idx),
      })),
    },
  ];

  return {
    items,
    currencies,
    mixedCurrencies,
    rows,
  };
}
