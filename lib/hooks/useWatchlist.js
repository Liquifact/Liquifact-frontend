import { useCallback } from "react";
import { useLocalStorage } from "./useLocalStorage";

/**
 * Hook to manage named watchlists and their starred invoices.
 */
export function useWatchlist() {
  const [watchlists, setWatchlists] = useLocalStorage("liquifact_watchlists", []);

  const addWatchlist = useCallback(
    (name) => {
      setWatchlists((prev) => {
        let current = Array.isArray(prev) ? prev : [];
        if (current.some((w) => w.name.toLowerCase() === name.toLowerCase())) {
          return current;
        }
        return [...current, { id: Date.now().toString(), name, invoiceIds: [] }];
      });
    },
    [setWatchlists]
  );

  const removeWatchlist = useCallback(
    (id) => {
      setWatchlists((prev) => {
        if (!Array.isArray(prev)) return [];
        return prev.filter((w) => w.id !== id);
      });
    },
    [setWatchlists]
  );

  const toggleInvoice = useCallback(
    (watchlistId, invoiceId) => {
      setWatchlists((prev) => {
        let current = Array.isArray(prev) ? prev : [];
        if (current.length === 0) {
          // Auto-create default watchlist and add invoice
          return [
            { id: Date.now().toString(), name: "Default Watchlist", invoiceIds: [invoiceId] },
          ];
        }

        const targetId = watchlistId || current[0].id;

        return current.map((w) => {
          if (w.id === targetId) {
            const hasInvoice = w.invoiceIds.includes(invoiceId);
            return {
              ...w,
              invoiceIds: hasInvoice
                ? w.invoiceIds.filter((id) => id !== invoiceId)
                : [...w.invoiceIds, invoiceId],
            };
          }
          return w;
        });
      });
    },
    [setWatchlists]
  );

  // Clean up stale IDs
  const pruneStaleInvoices = useCallback(
    (validInvoiceIds) => {
      setWatchlists((prev) => {
        if (!Array.isArray(prev)) return [];
        let changed = false;
        const updated = prev.map((w) => {
          const pruned = w.invoiceIds.filter((id) => validInvoiceIds.includes(id));
          if (pruned.length !== w.invoiceIds.length) changed = true;
          return { ...w, invoiceIds: pruned };
        });
        return changed ? updated : prev;
      });
    },
    [setWatchlists]
  );

  return {
    watchlists: Array.isArray(watchlists) ? watchlists : [],
    addWatchlist,
    removeWatchlist,
    toggleInvoice,
    pruneStaleInvoices,
  };
}
