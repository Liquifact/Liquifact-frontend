"use client";

import ErrorBoundary from "./ErrorBoundary";
import { copy } from "@/app/copy/en";
import ErrorBanner from "./ErrorBanner";
import WatchlistInput from "./WatchlistInput";
import { useWatchlist } from "@/lib/hooks/useWatchlist";
import { useHydrated } from "@/lib/hooks/useHydrated";
import { reportError } from "@/lib/observability/reportError";
import EmptyState from "@/components/EmptyState";

/**
 * Loading placeholder shown only for the brief post-mount window before the
 * `useLocalStorage`-backed watchlist read has had a chance to run.
 */
export function WatchlistSectionSkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      data-testid="watchlist-section-loading"
      className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
    >
      <span className="sr-only">Loading your watchlists…</span>

      {[0, 1, 2].map((i) => (
        <div
          key={i}
          aria-hidden="true"
          data-testid="watchlist-section-skeleton-card"
          className="rounded-xl border border-slate-800 bg-slate-900/30 p-5 animate-pulse space-y-3"
        >
          <div className="h-4 w-24 rounded bg-slate-700/60" />
          <div className="h-3 w-16 rounded bg-slate-700/40" />
        </div>
      ))}
    </div>
  );
}

export function WatchlistGrid({ watchlists, onRemoveWatchlist }) {
  if (watchlists.length === 0) {
    return (
      <div role="status" aria-live="polite">
        <EmptyState
          title="You don't have any watchlists yet"
          description="Create one above to start shortlisting invoices you want to track."
        />
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {watchlists.map((wl) => (
        <div key={wl.id} className="rounded-xl border border-slate-700 bg-slate-800/40 p-5">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-semibold text-cyan-300">{wl.name}</h3>

            <button
              type="button"
              onClick={() => onRemoveWatchlist(wl.id)}
              className="text-xs text-red-400 hover:text-red-300 focus:outline-none focus:ring-2 focus:ring-red-400 rounded"
              aria-label={`Delete ${wl.name} watchlist`}
            >
              Delete
            </button>
          </div>

          <p className="text-sm text-slate-400">
            {wl.invoiceIds.length} {wl.invoiceIds.length === 1 ? "invoice" : "invoices"}
          </p>
        </div>
      ))}
    </div>
  );
}

export default function WatchlistSection() {
  const { watchlists, addWatchlist, removeWatchlist } = useWatchlist();

  // Distinguish "still reading localStorage"
  // from "confirmed empty".
  const isHydrated = useHydrated();

  const handleCreateWatchlist = async (values) => {
    // In a real app we might await an API call;
    // here it's sync via the hook.
    addWatchlist(values.name);
  };

  return (
    <section className="mb-12">
      <h2 className="text-xl font-bold text-slate-100 mb-4">Your Watchlists</h2>

      {/* Watchlist creation form */}
      <div className="mb-8 max-w-md">
        <WatchlistInput onSubmit={handleCreateWatchlist} />
      </div>

      {/*
        Watchlists display:
        Loading → Error → Empty → Success
      */}
      {!isHydrated ? (
        <WatchlistSectionSkeleton />
      ) : (
        <ErrorBoundary
          onError={(err, info) =>
            reportError(err, {
              where: "watchlistSection",
              info,
            })
          }
          fallbackTitle="Unable to load your watchlists"
          fallbackDescription="Something went wrong while loading your watchlists. You can retry loading this section."
          retryLabel="Retry loading watchlists"
        >
          <WatchlistGrid watchlists={watchlists} onRemoveWatchlist={removeWatchlist} />
        </ErrorBoundary>
      )}
    </section>
  );
}
