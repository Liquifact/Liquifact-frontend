/**
 * @file Pagination.jsx
 * @description "Load more" pagination control for list views.
 *
 * Renders a visible count ("Showing N of M invoices") and a "Load more"
 * button.  The button is hidden once all items are visible.
 * The ref forwarded to the button lets callers restore focus after each
 * load to preserve keyboard accessibility.
 */

import { forwardRef } from "react";

/**
 * Pagination — accessible "Load more" control.
 *
 * @param {object}   props
 * @param {number}   props.shown       - Number of items currently visible.
 * @param {number}   props.total       - Total number of items available.
 * @param {Function} props.onLoadMore  - Callback invoked when the user clicks "Load more".
 * @param {React.Ref} ref             - Forwarded ref attached to the "Load more" button.
 *                                       Callers use this to restore focus after each load.
 * @returns {JSX.Element}
 */
const Pagination = forwardRef(function Pagination({ shown, total, onLoadMore }, ref) {
  const hasMore = shown < total;

  return (
    <div className="mt-6 flex flex-col items-center gap-4">
      {/* Visible count only; the page-level status region owns announcements. */}
      <p
        id="pagination-count"
        className="text-sm text-slate-400"
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
