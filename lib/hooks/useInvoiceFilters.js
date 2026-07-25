import { useMemo } from "react";
import { matchesYieldRange, matchesMaturityRange } from "@/components/InvoiceFilters";

/**
 * Parses a yield string (e.g., "8.2%") into a float (8.2).
 */
const parseYield = (yieldStr) => {
  if (!yieldStr) return 0;
  return parseFloat(yieldStr.replace("%", ""));
};

/**
 * Parses an amount string (e.g., "12,500") into a float (12500).
 */
const parseAmount = (amountStr) => {
  if (!amountStr) return 0;
  return parseFloat(amountStr.replace(/,/g, ""));
};

/**
 * useInvoiceFilters - A pure hook that takes an array of invoices, a search query,
 * and a filters object, and returns the filtered and sorted array of invoices.
 *
 * @param {Array} invoices - The array of invoice objects.
 * @param {string} searchQuery - The debounced search string to filter by issuer or ID.
 * @param {Object} filters - The active filters (yieldMin, yieldMax, currency, maturityFrom, maturityTo, sort).
 * @returns {Array} - The filtered and sorted array of invoices.
 */
export default function useInvoiceFilters(invoices, searchQuery, filters) {
  return useMemo(() => {
    if (!Array.isArray(invoices)) return [];

    const query = (searchQuery || "").toLowerCase().trim();

    // 1. Filter
    const filtered = invoices.filter((inv) => {
      // Text Search: check issuer or id
      if (query) {
        const issuerMatch = inv.issuer?.toLowerCase().includes(query);
        const idMatch = inv.id?.toLowerCase().includes(query);
        if (!issuerMatch && !idMatch) {
          return false;
        }
      }

      // Currency
      if (filters.currency && inv.currency !== filters.currency) {
        return false;
      }

      // Yield bounds — delegates to the guarded predicate in InvoiceFilters
      // so malformed range input (non-numeric, negative) is rejected the
      // same way here as it is in the UI, instead of silently coercing to
      // NaN comparisons that always evaluate false.
      if (filters.yieldMin || filters.yieldMax) {
        if (!matchesYieldRange(inv.yield, filters.yieldMin, filters.yieldMax)) return false;
      }

      // Maturity (DueDate) bounds — same rationale: reuse the guarded,
      // ISO-validated predicate rather than raw `new Date()` parsing, which
      // silently produces Invalid Date for malformed input and breaks
      // every subsequent comparison without surfacing an error.
      if (filters.maturityFrom || filters.maturityTo) {
        if (!matchesMaturityRange(inv.dueDate, filters.maturityFrom, filters.maturityTo)) {
          return false;
        }
      }

      return true;
    });

    // 2. Sort
    if (filters.sort) {
      filtered.sort((a, b) => {
        switch (filters.sort) {
          case "yield_desc":
            return parseYield(b.yield) - parseYield(a.yield);
          case "yield_asc":
            return parseYield(a.yield) - parseYield(b.yield);
          case "amount_desc":
            return parseAmount(b.amount) - parseAmount(a.amount);
          case "amount_asc":
            return parseAmount(a.amount) - parseAmount(b.amount);
          case "maturity_asc":
            return new Date(a.dueDate) - new Date(b.dueDate);
          case "maturity_desc":
            return new Date(b.dueDate) - new Date(a.dueDate);
          default:
            return 0;
        }
      });
    }

    return filtered;
  }, [invoices, searchQuery, filters]);
}
