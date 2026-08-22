import { useMemo } from "react";

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

      // Yield bounds
      if (filters.yieldMin || filters.yieldMax) {
        const invYield = parseYield(inv.yield);
        if (filters.yieldMin) {
          if (invYield < parseFloat(filters.yieldMin)) return false;
        }
        if (filters.yieldMax) {
          if (invYield > parseFloat(filters.yieldMax)) return false;
        }
      }

      // Maturity (DueDate) bounds
      if (filters.maturityFrom || filters.maturityTo) {
        const invDate = new Date(inv.dueDate);
        if (filters.maturityFrom) {
          const fromDate = new Date(filters.maturityFrom);
          if (invDate < fromDate) return false;
        }
        if (filters.maturityTo) {
          const toDate = new Date(filters.maturityTo);
          if (invDate > toDate) return false;
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
