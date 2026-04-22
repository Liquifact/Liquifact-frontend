/**
 * InvoiceListSkeleton
 *
 * Renders N placeholder rows that mirror the real invoice-list card layout.
 * Swap this out once the API contract is finalised (see issue #14 follow-up).
 *
 * Mock data contract (per row):
 *   { id, issuer, amount, currency, dueDate, yield, status }
 */
export default function InvoiceListSkeleton({ rows = 3 }) {
  return (
    <ul aria-label="Loading invoices" aria-busy="true" className="space-y-4">
      {Array.from({ length: rows }).map((_, i) => (
        <li
          key={i}
          className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 animate-pulse"
        >
          {/* Row: issuer + status badge */}
          <div className="flex items-center justify-between mb-3">
            <div className="h-4 w-36 rounded bg-slate-700" />
            <div className="h-5 w-20 rounded-full bg-slate-700" />
          </div>
          {/* Row: amount + yield + due date */}
          <div className="flex gap-6">
            <div className="h-3 w-24 rounded bg-slate-800" />
            <div className="h-3 w-16 rounded bg-slate-800" />
            <div className="h-3 w-28 rounded bg-slate-800" />
          </div>
        </li>
      ))}
    </ul>
  );
}
