/**
 * @file Pagination.jsx
 * @description "Load more" pagination control for list views.
 *
 * Renders a count announcement ("Showing N of M invoices") and a
 * "Load more" button.  The button is hidden once all items are visible.
 * The ref forwarded to the button lets callers restore focus after each
 * load to preserve keyboard accessibility.
 *
 * When `page` and `totalPages` props are supplied the component also renders
 * a hidden polite status region that announces "Page X of Y, showing items
 * A–B" on every real page change (issue #276).  The region is omitted in
 * load-more mode so it does not compete with the marketplace list announcer.
 */

import { forwardRef, useEffect, useRef, useState } from "react";

export function normalizePaginationParams({
  page,
  pageSize,
  totalItems = 0,
  defaultPageSize = 10,
} = {}) {
  const safeTotalItems = Number.isFinite(totalItems) ? Math.max(0, Math.trunc(totalItems)) : 0;
  const safeDefaultPageSize =
    Number.isInteger(defaultPageSize) && defaultPageSize > 0 ? defaultPageSize : 10;
  const maxPageSize = Math.max(1, safeTotalItems > 0 ? safeTotalItems : safeDefaultPageSize);

  const parsedPage = Number.parseInt(String(page), 10);
  const parsedPageSize = Number.parseInt(String(pageSize), 10);

  const hasValidPage = Number.isInteger(parsedPage) && parsedPage > 0;
  const hasValidPageSize = Number.isInteger(parsedPageSize) && parsedPageSize > 0;

  const normalizedPageSize = hasValidPageSize
    ? Math.max(1, Math.min(parsedPageSize, maxPageSize))
    : safeDefaultPageSize;

  const totalPages = Math.max(1, Math.ceil(safeTotalItems / normalizedPageSize));
  const normalizedPage = hasValidPage ? Math.min(parsedPage, totalPages) : 1;

  return {
    page: Math.max(1, normalizedPage),
    pageSize: Math.max(1, normalizedPageSize),
    totalPages,
  };
}

/**
 * Pagination — accessible "Load more" control.
 *
 * @param {object}   props
 * @param {number}   props.shown        - Number of items currently visible.
 * @param {number}   props.total        - Total number of items available.
 * @param {Function} props.onLoadMore   - Callback invoked when the user clicks "Load more".
 * @param {number}   [props.page]       - Current page number (1-based). When provided
 *                                        together with `totalPages` and `pageSize` the
 *                                        component announces page changes via a hidden
 *                                        polite status region (issue #276).
 * @param {number}   [props.totalPages] - Total number of pages.
 * @param {number}   [props.pageSize]   - Items per page, used to derive the item range.
 * @param {React.Ref} ref              - Forwarded ref attached to the "Load more" button.
 *                                       Callers use this to restore focus after each load.
 * @returns {JSX.Element}
 */
const Pagination = forwardRef(function Pagination(
  { shown, total, onLoadMore, page, totalPages, pageSize },
  ref
) {
  const hasMore = shown < total;

  // Page-based announcement (issue #276).
  // Only active when caller supplies page + totalPages so we do not compete
  // with the marketplace list announcer in load-more mode.
  const isPageMode = page != null && totalPages != null;
  const [announcement, setAnnouncement] = useState("");
  const prevPageRef = useRef(null);

  useEffect(() => {
    if (!isPageMode) return;
    // Skip initial render — only announce on real page changes.
    if (prevPageRef.current === null) {
      prevPageRef.current = page;
      return;
    }
    if (prevPageRef.current === page) return;

    prevPageRef.current = page;

    const itemsPerPage = pageSize ?? shown;
    const firstItem = (page - 1) * itemsPerPage + 1;
    const lastItem = Math.min(page * itemsPerPage, total);
    setAnnouncement(`Page ${page} of ${totalPages}, showing items ${firstItem}–${lastItem}`);
  }, [page, totalPages, pageSize, shown, total, isPageMode]);

  return (
    <div className="mt-6 flex flex-col items-center gap-4">
      {/* Hidden polite status region for page-based navigation (issue #276).
          Rendered only in page mode to avoid competing with the load-more
          live region already present in the marketplace list announcer. */}
      {isPageMode && (
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
          data-testid="pagination-announce"
        >
          {announcement}
        </div>
      )}

      {/* Count announcement — always visible for sighted users */}
      <p
        id="pagination-count"
        className="text-sm text-slate-400"
        aria-live="polite"
        aria-atomic="true"
      >
        Showing <strong className="text-slate-200">{shown}</strong> of{" "}
        <strong className="text-slate-200">{total}</strong> invoice
        {total !== 1 ? "s" : ""}
      </p>

      {hasMore && (
        <button
          ref={ref}
          type="button"
          id="load-more-invoices"
          aria-label="Load more invoices"
          onClick={onLoadMore}
          className="rounded-lg border border-cyan-700 bg-cyan-900/30 px-6 py-2.5 text-sm font-medium text-cyan-300 transition-colors hover:bg-cyan-800/40 hover:border-cyan-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
        >
          Load more
        </button>
      )}
    </div>
  );
});

export default Pagination;
