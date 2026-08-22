"use client";

/**
 * @file MarketplaceContext.jsx
 *
 * React Context that owns the invoice list state for the invest (marketplace)
 * routes.  It wraps both the list page (`/invest`) and the detail page
 * (`/invest/[id]`) so that optimistic updates applied on the detail page
 * (e.g. funding an invoice) are immediately visible when the user navigates
 * back to the list.
 *
 * The provider exposes:
 *   - `invoices`      — current invoice array (may be null while loading)
 *   - `setInvoices`   — setter for replacing the full list (used by the loader)
 *   - `pendingIds`    — Set of invoice ids with in-flight fund actions
 *   - `fundInvoice`   — orchestrates optimistic status update + server action +
 *                        rollback on failure with toast feedback
 */

import { createContext, useCallback, useContext, useMemo } from "react";
import { useMarketplaceActions } from "@/lib/hooks/useMarketplaceActions";

const MarketplaceContext = createContext(null);

/**
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @param {Array|null} props.invoices   — invoice array managed by the parent
 * @param {Function} props.setInvoices  — setter to replace the full invoice list
 */
export function MarketplaceProvider({ children, invoices, setInvoices }) {
  const { pendingIds, fund } = useMarketplaceActions();

  /**
   * Fund an invoice with optimistic status change.
   *
   * 1. Optimistically flip the invoice's status to "Funded".
   * 2. Run the caller-provided async action.
   * 3. On success — the optimistic status stays (committed).
   * 4. On failure — the invoice reverts to its original status and the error
   *    is re-thrown so the caller can surface a toast.
   *
   * @param {string}   invoiceId
   * @param {number}   amount
   * @param {Function} performAction — async (invoiceId, amount) => void
   * @returns {Promise<boolean>}
   */
  const fundInvoice = useCallback(
    async (invoiceId, amount, performAction) => {
      return fund(invoiceId, amount, performAction, {
        optimisticUpdate: (id) => {
          // Snapshot the current invoice for rollback.
          const current = invoices?.find((inv) => inv.id === id) ?? null;
          const snapshot = current ? { ...current } : null;

          // Flip status immediately.
          setInvoices((prev) =>
            Array.isArray(prev)
              ? prev.map((inv) => (inv.id === id ? { ...inv, status: "Funded" } : inv))
              : prev
          );

          return snapshot;
        },
        rollback: (id, snapshot) => {
          if (!snapshot) return;
          setInvoices((prev) =>
            Array.isArray(prev) ? prev.map((inv) => (inv.id === id ? snapshot : inv)) : prev
          );
        },
      });
    },
    [fund, invoices, setInvoices]
  );

  const value = useMemo(
    () => ({
      invoices,
      setInvoices,
      pendingIds,
      fundInvoice,
    }),
    [invoices, setInvoices, pendingIds, fundInvoice]
  );

  return <MarketplaceContext.Provider value={value}>{children}</MarketplaceContext.Provider>;
}

/**
 * Access marketplace invoice state and the optimistic fund action.
 *
 * @returns {{
 *   invoices: Array|null,
 *   setInvoices: Function,
 *   pendingIds: Set<string>,
 *   fundInvoice: (invoiceId: string, amount: number, performAction: () => Promise<void>) => Promise<boolean>
 * }}
 */
export function useMarketplace() {
  const ctx = useContext(MarketplaceContext);
  if (!ctx) {
    throw new Error("useMarketplace must be used within a MarketplaceProvider");
  }
  return ctx;
}
