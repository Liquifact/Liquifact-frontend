/**
 * @file components/Watchlist.jsx
 * Watchlist component displaying saved/starred invoices with support for:
 *   - Loading state (aria-busy, skeletons, exclusivity)
 *   - Empty state (accessible messaging, illustration, CTA button, exclusivity)
 *   - Error state (role="alert", error banner, retry action, exclusivity)
 *   - Success state (accessible list, status live region, filtering/search, star/remove controls)
 *   - Primary interactions & keyboard accessibility
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import ErrorBanner from "./ErrorBanner";
import EmptyState from "./EmptyState";
import StatusPill from "./StatusPill";
import { formatCurrency } from "../lib/format/currency";
import { getInvoiceDetailHref } from "@/lib/marketplaceRoute";

/**
 * @typedef {Object} WatchlistItem
 * @property {string} id
 * @property {string} [issuer]
 * @property {string|number} [amount]
 * @property {string} [currency]
 * @property {string} [dueDate]
 * @property {string|number} [yield]
 * @property {string} [status]
 */

/**
 * Star icon SVG component.
 * @param {{ filled?: boolean }} props
 */
function StarIcon({ filled = false }) {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385c.116.488-.415.873-.837.618l-4.71-2.844a.563.563 0 00-.582 0l-4.71 2.844c-.422.255-.953-.13-.837-.618l1.285-5.385a.563.563 0 00-.182-.557l-4.204-3.602c-.38-.325-.178-.948.32-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
      />
    </svg>
  );
}

/**
 * Loading skeleton row for Watchlist.
 */
function WatchlistSkeletonRow() {
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

/**
 * @param {Object} props
 * @param {WatchlistItem[]} [props.items=[]] - List of watchlist invoice items.
 * @param {boolean} [props.loading=false] - Loading state flag.
 * @param {string|Error|null} [props.error=null] - Error message or object.
 * @param {(id: string) => void} [props.onRemoveItem] - Callback when an item is removed.
 * @param {(id: string) => void} [props.onToggleStar] - Callback when star button is toggled.
 * @param {() => void} [props.onClearAll] - Callback to clear all items from watchlist.
 * @param {() => void} [props.onRetry] - Callback to retry loading on error.
 * @param {string} [props.title="Watchlist"] - Component heading title.
 */
export default function Watchlist({
  items = [],
  loading = false,
  error = null,
  onRemoveItem,
  onToggleStar,
  onClearAll,
  onRetry,
  title = "Watchlist",
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkAnnouncement, setBulkAnnouncement] = useState("");
  const [liveAnnouncement, setLiveAnnouncement] = useState("");
  const [hasMounted, setHasMounted] = useState(false);

  const errorMessage = useMemo(() => {
    if (!error) return "";
    if (typeof error === "string") return error;
    return error.message || "Failed to load watchlist items.";
  }, [error]);

  const filteredItems = useMemo(() => {
    if (!Array.isArray(items)) return [];
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase().trim();
    return items.filter((item) => {
      const issuerMatch = item.issuer?.toLowerCase().includes(q);
      const idMatch = item.id?.toLowerCase().includes(q);
      const statusMatch = item.status?.toLowerCase().includes(q);
      return issuerMatch || idMatch || statusMatch;
    });
  }, [items, searchQuery]);

  const allSelected =
    filteredItems.length > 0 && filteredItems.every((item) => selectedIds.has(item.id));
  const someSelected = filteredItems.some((item) => selectedIds.has(item.id));

  const computedAnnouncement = useMemo(() => {
    if (loading || errorMessage) return "";
    if (!items || items.length === 0) return "Your watchlist is empty";
    if (searchQuery.trim()) {
      return `Showing ${filteredItems.length} of ${items.length} watchlist items for search "${searchQuery.trim()}"`;
    }
    return `${items.length} invoice${items.length === 1 ? "" : "s"} in watchlist`;
  }, [errorMessage, filteredItems.length, items, loading, searchQuery]);

  useEffect(() => {
    if (!hasMounted) {
      setHasMounted(true);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setLiveAnnouncement(computedAnnouncement);
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [computedAnnouncement, hasMounted]);

  const handleSelectAll = () => {
    const next = new Set(selectedIds);
    if (allSelected) {
      filteredItems.forEach((item) => next.delete(item.id));
    } else {
      filteredItems.forEach((item) => next.add(item.id));
    }
    setSelectedIds(next);
  };

  const handleToggleSelection = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleBulkRemove = () => {
    if (selectedIds.size === 0) return;
    if (window.confirm(`Are you sure you want to remove ${selectedIds.size} items?`)) {
      const count = selectedIds.size;
      selectedIds.forEach((id) => {
        if (onRemoveItem) onRemoveItem(id);
      });
      setSelectedIds(new Set());
      setBulkAnnouncement(`Removed ${count} items.`);
    }
  };

  const handleBulkExport = () => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    setSelectedIds(new Set());
    setBulkAnnouncement(`Exported ${count} items.`);
  };

  // 1. Loading State & Loading Exclusivity
  if (loading) {
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
          <WatchlistSkeletonRow />
          <WatchlistSkeletonRow />
          <WatchlistSkeletonRow />
        </div>
      </section>
    );
  }

  // 2. Error State & Exclusivity
  if (errorMessage) {
    return (
      <section
        aria-label={title}
        className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl space-y-4"
      >
        <h2 className="text-xl font-semibold text-slate-100">{title}</h2>
        <ErrorBanner
          title="Unable to load watchlist"
          description={errorMessage}
          actionLabel={onRetry ? "Retry loading" : undefined}
          onAction={onRetry}
        />
      </section>
    );
  }

  // 3. Empty State & Exclusivity
  if (!items || items.length === 0) {
    return (
      <section
        aria-label={title}
        className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl"
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <h2 className="text-xl font-semibold text-slate-100">{title}</h2>
        </div>
        <div className="mt-6">
          <p
            role="status"
            data-testid="watchlist-status"
            aria-live="polite"
            aria-atomic="true"
            className="sr-only"
          >
            {liveAnnouncement}
          </p>
          <EmptyState
            title="Your watchlist is empty"
            description="Star invoices from the marketplace to keep track of them here."
            action={
              <Link
                href="/invest"
                className="inline-flex items-center gap-2 rounded-xl border border-cyan-700 bg-cyan-900/30 px-5 py-2.5 text-sm font-semibold text-cyan-300 transition-colors hover:bg-cyan-800/40 focus-visible:outline-none focus-ring"
              >
                Browse marketplace
              </Link>
            }
          />
        </div>
      </section>
    );
  }

  // 4. Success State & Primary Interactions
  return (
    <section
      aria-label={title}
      className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl space-y-6"
    >
      {/* Header with Title and Clear All */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-semibold text-slate-100">{title}</h2>
          <p className="text-sm text-slate-400 mt-1">
            Manage your shortlisted invoices and track updates.
          </p>
        </div>
        {onClearAll && items.length > 0 && (
          <button
            type="button"
            onClick={onClearAll}
            aria-label="Clear all watchlist items"
            className="self-start sm:self-auto rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-300 transition-colors hover:bg-red-500/20 focus-visible:outline-none focus-ring"
          >
            Clear watchlist
          </button>
        )}
      </div>

      {/* Live status announcement */}
      <p
        role="status"
        data-testid="watchlist-status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {liveAnnouncement}
      </p>
      {/* Bulk action announcement */}
      <p role="status" aria-live="polite" className="sr-only">
        {bulkAnnouncement}
      </p>

      {/* Controls: Search input */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <label htmlFor="watchlist-search" className="sr-only">
            Search watchlist
          </label>
          <input
            id="watchlist-search"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search watchlist..."
            aria-label="Search watchlist"
            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-sm text-slate-100 placeholder-slate-500 transition-colors focus-visible:border-cyan-500 focus-visible:outline-none focus-ring"
          />
        </div>

        {/* Bulk Action Toolbar */}
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={allSelected}
              ref={(input) => {
                if (input) input.indeterminate = !allSelected && someSelected;
              }}
              onChange={handleSelectAll}
              aria-label="Select all watchlist items"
              className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-cyan-500 focus-visible:outline-none focus-ring"
            />
            Select all
          </label>

          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">{selectedIds.size} selected</span>
              <button
                type="button"
                onClick={handleBulkExport}
                aria-label={`Export ${selectedIds.size} selected items`}
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 focus-visible:outline-none focus-ring"
              >
                Export
              </button>
              <button
                type="button"
                onClick={handleBulkRemove}
                aria-label={`Remove ${selectedIds.size} selected items`}
                className="rounded-lg border border-red-900/50 bg-red-900/20 px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-900/40 focus-visible:outline-none focus-ring"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Search No Matches Fallback */}
      {filteredItems.length === 0 ? (
        <div className="py-8 text-center" role="region" aria-label="No matching items">
          <p className="text-sm text-slate-400">
            No watchlist items match &quot;{searchQuery}&quot;.
          </p>
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="mt-3 text-xs font-medium text-cyan-400 underline hover:text-cyan-300 focus-visible:outline-none focus-ring"
            aria-label="Clear search filter"
          >
            Clear search filter
          </button>
        </div>
      ) : (
        /* Items List */
        <ul aria-label="Watchlist items" className="space-y-3">
          {filteredItems.map((item) => {
            const isSelected = selectedIds.has(item.id);

            const handleToggle = () => {
              if (onToggleStar) {
                onToggleStar(item.id);
              } else if (onRemoveItem) {
                onRemoveItem(item.id);
              }
            };

            const handleRemove = () => {
              if (onRemoveItem) {
                onRemoveItem(item.id);
              }
            };

            const issuerName = item.issuer || "Unknown issuer";
            const formattedAmount =
              typeof item.amount === "number" || (typeof item.amount === "string" && item.amount)
                ? formatCurrency(item.amount, { currency: item.currency || "USD" })
                : "—";

            return (
              <li
                key={item.id}
                className={`group flex flex-col gap-4 rounded-xl border p-4 transition-colors hover:border-slate-700 sm:flex-row sm:items-center sm:justify-between ${
                  isSelected ? "border-cyan-800 bg-cyan-950/30" : "border-slate-800 bg-slate-950/60"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex items-center h-8">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleSelection(item.id)}
                      aria-label={`Select invoice ${item.id} from ${issuerName}`}
                      className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-cyan-500 focus-visible:outline-none focus-ring cursor-pointer"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleToggle}
                    aria-pressed={true}
                    aria-label={`Remove invoice ${item.id} from watchlist`}
                    title={`Starred — click to remove ${item.id}`}
                    className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-amber-400/30 bg-amber-400/10 text-amber-400 transition-colors hover:bg-amber-400/20 focus-visible:outline-none focus-ring"
                  >
                    <StarIcon filled={true} />
                  </button>
                  <div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={getInvoiceDetailHref(item.id, searchParams)}
                        className="font-semibold text-slate-100 hover:text-cyan-300 focus-visible:outline-none focus-ring"
                        aria-label={`View details for invoice ${item.id} from ${issuerName}`}
                      >
                        {issuerName}
                      </Link>
                      {item.status && <StatusPill status={item.status} />}
                    </div>
                    <p className="text-xs font-mono text-slate-500 mt-0.5">{item.id}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-6 text-sm">
                  <div className="text-right">
                    <p className="font-mono text-slate-200">{formattedAmount}</p>
                    {item.yield && (
                      <p className="text-xs text-cyan-400 font-mono">{item.yield} yield</p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleRemove}
                    aria-label={`Remove ${issuerName} from watchlist`}
                    className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-slate-700 hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-ring"
                  >
                    Remove
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
