/**
 * @file components/InvoiceListSkeleton.jsx
 * Placeholder rows shown while invoices are loading.
 *
 * Column widths deliberately mirror InvoiceCard so the layout does not shift
 * when real cards replace the skeleton. Any structural change to InvoiceCard
 * must be reflected here.
 *
 * @see components/InvoiceCard.jsx  — canonical card markup
 * @see lib/types/invoice.js        — Invoice typedef
 */

/**
 * @param {object} props
 * @param {number} [props.rows=3]  Number of skeleton rows to render
 */
export default function InvoiceListSkeleton({ rows = 3, ...props }) {
  return (
    <ul aria-label="Loading investable invoices" aria-busy="true" className="space-y-4">
      {Array.from({ length: rows }).map((_, i) => (
        <li
          // Use a prefix with index for a stable, deterministic skeleton key since rows are presentational-only
          key={`skeleton-row-${i}`}
          className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 animate-pulse"
        >
          {/* Mirrors InvoiceCard row layout */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {/* Issuer — basis-1/4 */}
            <div className="min-w-0 flex-1 basis-1/4 space-y-1.5">
              <div className="h-3.5 w-3/4 rounded bg-slate-700" />
              <div className="h-2.5 w-1/3 rounded bg-slate-800" />
            </div>

            {/* Amount — basis-1/5 */}
            <div className="basis-1/5 space-y-1.5 flex flex-col items-end">
              <div className="h-3.5 w-28 rounded bg-slate-700" />
              <div className="h-2.5 w-12 rounded bg-slate-800" />
            </div>

            {/* Yield — basis-1/6 */}
            <div className="basis-1/6 space-y-1.5 flex flex-col items-end">
              <div className="h-3.5 w-12 rounded bg-slate-700" />
              <div className="h-2.5 w-10 rounded bg-slate-800" />
            </div>

            {/* Maturity — basis-1/5 */}
            <div className="basis-1/5 space-y-1.5 flex flex-col items-end">
              <div className="h-3.5 w-24 rounded bg-slate-700" />
              <div className="h-2.5 w-14 rounded bg-slate-800" />
            </div>

            {/* Status badge — basis-auto */}
            <div className="basis-auto">
              <div className="h-5 w-16 rounded-full bg-slate-700" />
            </div>
          </div>
        </li>
      ))}
      <span className="sr-only">Loading invoices, please wait…</span>
    </ul>
  );
}
