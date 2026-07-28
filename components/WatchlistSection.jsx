"use client";

import { ErrorBoundary } from "react-error-boundary";
import { copy } from "@/app/copy/en";
import ErrorBanner from "./ErrorBanner";
import WatchlistInput from "./WatchlistInput";
import { useWatchlist } from "@/lib/hooks/useWatchlist";

function WatchlistSectionFallback({ error, resetErrorBoundary }) {
  return (
    <ErrorBanner
      title="Watchlist Error"
      description={error.message || "An error occurred while loading the watchlists."}
      actionLabel="Try Again"
      onAction={resetErrorBoundary}
    />
  );
}

export default function WatchlistSection() {
  const { watchlists, addWatchlist, removeWatchlist } = useWatchlist();

  const handleCreateWatchlist = async (values) => {
    // In a real app we might await an API call, here it's sync via hook
    addWatchlist(values.name);
  };

  return (
    <ErrorBoundary FallbackComponent={WatchlistSectionFallback}>
      <section className="mb-12">
        <h2 className="text-xl font-bold text-slate-100 mb-4">Your Watchlists</h2>
        
        {/* Watchlist creation form */}
        <div className="mb-8 max-w-md">
          <WatchlistInput onSubmit={handleCreateWatchlist} />
        </div>

        {/* Watchlists display */}
        {watchlists.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-8 text-center text-slate-500">
            You don't have any watchlists yet. Create one above to start shortlisting invoices.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {watchlists.map((wl) => (
              <div key={wl.id} className="rounded-xl border border-slate-700 bg-slate-800/40 p-5">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-cyan-300">{wl.name}</h3>
                  <button
                    onClick={() => removeWatchlist(wl.id)}
                    className="text-xs text-red-400 hover:text-red-300 focus-visible:outline-none focus-ring rounded"
                    aria-label={`Delete ${wl.name} watchlist`}
                  >
                    Delete
                  </button>
                </div>
                <p className="text-sm text-slate-400">
                  {wl.invoiceIds.length} {wl.invoiceIds.length === 1 ? 'invoice' : 'invoices'}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </ErrorBoundary>
  );
}
