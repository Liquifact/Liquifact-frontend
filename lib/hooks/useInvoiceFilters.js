import { useMemo } from "react";

/**
 * Parses a yield string (e.g., "8.2%") into a float (8.2).
 * Returns NaN for invalid input so callers can decide how to treat it.
 */
const parseYield = (yieldStr) => {
  if (yieldStr === null || yieldStr === undefined || yieldStr === "") return NaN;
  const numeric = String(yieldStr).replace(/[%,\u2030\u00A0\uFEFF]/g, "").trim();
  if (numeric === "") return NaN;
  const parsed = Number(numeric);
  return Number.isFinite(parsed) ? parsed : NaN;
};

/**
 * Parses an amount string (e.g., "12,500") into a float (12500).
 * Returns NaN for invalid input.
 */
const parseAmount = (amountStr) => {
  if (amountStr === null || amountStr === undefined || amountStr === "") return NaN;
  const numeric = String(amountStr).replace(/,/g, "").trim();
  if (numeric === "") return NaN;
  const parsed = Number(numeric);
  return Number.isFinite(parsed) ? parsed : NaN;
};

/**
 * Parses a numeric bound from filter input. Returns NaN when the bound is not a
 * usable number so the filter is ignored rather than comparing against NaN.
 */
const parseBound = (value) => {
  if (value === null || value === undefined || value === "") return NaN;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
};

/**
 * Parses a date into a timestamp. Returns NaN for invalid dates so callers can
 * decide whether to exclude or ignore the value.
 */
const parseDate = (value) => {
  if (value === null || value === undefined || value === "") return NaN;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : NaN;
};

/**
 * NaN-safe numeric comparison. Invalid values sort to the end in ascending
 * order and to the front in descending order, but always in a deterministic
 * position relative to each other.
 */
const compareNumeric = (a, b) => {
  const aNaN = Number.isNaN(a);
  const bNaN = Number.isNaN(b);
  if (aNaN && bNaN) return 0;
  if (aNaN) return 1;
  if (bNaN) return -1;
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
};

/**
 * Deterministic comparator factory. Unknown or invalid sort keys return 0,
 * preserving the original order (Array.prototype.sort is stable in modern engines).
 */
const getComparator = (sort) => {
  switch (sort) {
    case "yield_desc":
      return (a, b) => compareNumeric(parseYield(b.yield), parseYield(a.yield));
    case "yield_asc":
      return (a, b) => compareNumeric(parseYield(a.yield), parseYield(b.yield));
    case "amount_desc":
      return (a, b) => compareNumeric(parseAmount(b.amount), parseAmount(a.amount));
    case "amount_asc":
      return (a, b) => compareNumeric(parseAmount(a.amount), parseAmount(b.amount));
    case "maturity_asc":
      return (a, b) => compareNumeric(parseDate(a.dueDate), parseDate(b.dueDate));
    case "maturity_desc":
      return (a, b) => compareNumeric(parseDate(b.dueDate), parseDate(a.dueDate));
    default:
      return () => 0;
  }
};

/**
 * Normalizes the filters object into a stable primitive key so the memo cache
 * invalidates deterministically even when callers pass a new object literal on
 * every render.
 */
const getFiltersKey = (filters) => {
  if (!filters || typeof filters !== "object") return "";
  return [
    filters.currency ?? "",
    filters.yieldMin ?? "",
    filters.yieldMax ?? "",
    filters.maturityFrom ?? "",
    filters.maturityTo ?? "",
    filters.sort ?? "",
  ].join("\u0000");
};

/**
 * useInvoiceFilters - A pure hook that takes an array of invoices, a search query,
 * and a filters object, and returns the filtered and sorted array of invoices.
 *
 * Invariants:
 *  - The input `invoices` array is never mutated; a new array is always returned.
 *  - Repeated invocations with the same inputs produce the same output order.
 *  - Invalid numeric/date values are treated deterministically and never cause
 *    silent drops or NaN comparisons.
 *
 * @param {Array} invoices - The array of invoice objects.
 * @param {string} searchQuery - The debounced search string to filter by issuer or ID.
 * @param {Object} filters - The active filters (yieldMin, yieldMax, currency, maturityFrom, maturityTo, sort).
 * @returns {Array} - The filtered and sorted array of invoices.
 */
export default function useInvoiceFilters(invoices, searchQuery, filters) {
  const filtersKey = getFiltersKey(filters);

  return useMemo(() => {
    if (!Array.isArray(invoices)) return [];

    const safeFilters = filters && typeof filters === "object" ? filters : {};
    const query = (searchQuery || "").toLowerCase().trim();

    const yieldMin = parseBound(safeFilters.yieldMin);
    const yieldMax = parseBound(safeFilters.yieldMax);
    const maturityFrom = parseDate(safeFilters.maturityFrom);
    const maturityTo = parseDate(safeFilters.maturityTo);
    const currency = safeFilters.currency;

    // 1. Filter. Always build a new array so the input is never mutated.
    const filtered = [];
    for (const inv of invoices) {
      if (!inv || typeof inv !== "object") continue;

      // Text Search: check issuer or id
      if (query) {
        const issuer = typeof inv.issuer === "string" ? inv.issuer.toLowerCase() : "";
        const id = typeof inv.id === "string" ? inv.id.toLowerCase() : "";
        if (!issuer.includes(query) && !id.includes(query)) {
          continue;
        }
      }

      // Currency
      if (currency && inv.currency !== currency) {
        continue;
      }

      // Yield bounds. Invalid invoice yield is excluded when a bound is active
      // so it cannot silently pass a filter it does not satisfy.
      if (!Number.isNaN(yieldMin) || !Number.isNaN(yieldMax)) {
        const invYield = parseYield(inv.yield);
        if (Number.isNaN(invYield)) continue;
        if (!Number.isNaN(yieldMin) && invYield < yieldMin) continue;
        if (!Number.isNaN(yieldMax) && invYield > yieldMax) continue;
      }

      // Maturity (DueDate) bounds. Invalid dates are excluded when a bound is
      // active to avoid inconsistent comparisons.
      if (!Number.isNaN(maturityFrom) || !Number.isNaN(maturityTo)) {
        const invDate = parseDate(inv.dueDate);
        if (Number.isNaN(invDate)) continue;
        if (!Number.isNaN(maturityFrom) && invDate < maturityFrom) continue;
        if (!Number.isNaN(maturityTo) && invDate > maturityTo) continue;
      }

      filtered.push(inv);
    }

    // 2. Sort. Sort a new array and use a NaN-safe comparator for determinism.
    const comparator = getComparator(safeFilters.sort);
    return filtered.sort(comparator);
  }, [invoices, searchQuery, filtersKey]);
}
