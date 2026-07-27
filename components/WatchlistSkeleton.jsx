import React from "react";

/**
 * WatchlistSkeleton component
 * Renders a loading skeleton matching the layout of Watchlist.
 * Includes multiple rows of skeletons for invoice items.
 */
export default function WatchlistSkeleton({ rows = 3, title = "Watchlist" }) {
  return (
    <section
      aria-label={title}
      aria-busy="true"
      className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl"
    >
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <h2 className="text-xl font-semibold text-slate-100">{title}</h2>
        <span role="status" className="text-xs text-slate-400">
          Loading watchlist...
        </span>
      </div>
      <div className="mt-6 space-y-3">
        {Array.from({ length: rows }).map((_, index) => (
          <WatchlistSkeletonRow key={index} />
        ))}
      </div>
    </section>
  );
}

/**
 * Single skeleton row matching the watchlist item layout.
 */
export function WatchlistSkeletonRow() {
  return (
    <div
      data-testid="watchlist-skeleton"
      aria-hidden="true"
      className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-900/40 p-4 animate-pulse sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="space-y-2">
        <div className="h-4 w-32 rounded bg-slate-800" />
        <div className="h-3 w-20 rounded bg-slate-800/60" />
      </div>
      <div className="flex items-center gap-4">
        <div className="h-5 w-24 rounded bg-slate-800" />
        <div className="h-5 w-16 rounded bg-slate-800" />
        <div className="h-8 w-20 rounded bg-slate-800" />
      </div>
    </div>
  );
}
