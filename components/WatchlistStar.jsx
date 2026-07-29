"use client";

import { useWatchlist } from "@/lib/hooks/useWatchlist";
import { useCallback, useMemo } from "react";

export default function WatchlistStar({ invoiceId }) {
  const { watchlists, addWatchlist, toggleInvoice } = useWatchlist();

  // Find if it's in any watchlist
  const isStarred = useMemo(() => {
    return watchlists.some((wl) => wl.invoiceIds.includes(invoiceId));
  }, [watchlists, invoiceId]);

  const handleToggle = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();

      // Toggle in the first watchlist by default (null will map to the first id)
      toggleInvoice(null, invoiceId);
    },
    [invoiceId, toggleInvoice]
  );

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={`p-2 rounded-full focus:outline-none focus:ring-2 focus:ring-cyan-400 transition-colors ${
        isStarred ? "text-yellow-400 hover:text-yellow-300" : "text-slate-500 hover:text-slate-400"
      }`}
      aria-label={isStarred ? "Remove from watchlist" : "Add to watchlist"}
      aria-pressed={isStarred}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill={isStarred ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-5 h-5"
        aria-hidden="true"
        focusable="false"
      >
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    </button>
  );
}
