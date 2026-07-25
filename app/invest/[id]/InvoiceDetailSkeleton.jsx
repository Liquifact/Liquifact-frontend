"use client";

/**
 * @file app/invest/[id]/InvoiceDetailSkeleton.jsx
 *
 * Placeholder rows shown while invoice detail is loading.
 * Mirrors the layout of InvoiceDetailData for zero layout shift.
 */

import Spinner from "@/components/Spinner";

export default function InvoiceDetailSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      {/* Back link placeholder */}
      <div className="no-print">
        <div className="h-4 w-32 rounded bg-slate-800 animate-pulse" />
      </div>

      {/* Page heading placeholder */}
      <div className="h-7 w-48 rounded bg-slate-800 animate-pulse" />
      <div className="h-4 w-full max-w-xl rounded bg-slate-800 animate-pulse" />

      {/* Invoice metadata section skeleton */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 animate-pulse space-y-4">
        <div className="h-6 w-48 rounded bg-slate-700" /> {/* issuer heading */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 space-y-4">
          {/* Row 1: Issuer + Amount */}
          <div className="space-y-1.5">
            <div className="h-3.5 w-20 rounded bg-slate-700" /> {/* label */}
            <div className="h-5 w-40 rounded bg-slate-800" /> {/* value */}
          </div>
          <div className="space-y-1.5">
            <div className="h-3.5 w-20 rounded bg-slate-700" />
            <div className="h-5 w-40 rounded bg-slate-800" />
          </div>
          {/* Row 2: Yield + Maturity */}
          <div className="space-y-1.5">
            <div className="h-3.5 w-20 rounded bg-slate-700" />
            <div className="h-5 w-28 rounded bg-slate-800" />
          </div>
          <div className="space-y-1.5">
            <div className="h-3.5 w-20 rounded bg-slate-700" />
            <div className="h-5 w-32 rounded bg-slate-800" />
          </div>
          {/* Row 3: Status */}
          <div className="space-y-1.5">
            <div className="h-3.5 w-20 rounded bg-slate-700" />
            <div className="h-5 w-24 rounded bg-slate-800" />
          </div>
        </div>
      </div>

      {/* Timeline skeleton */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 animate-pulse space-y-4">
        <div className="h-5 w-36 rounded bg-slate-700" /> {/* heading */}
        <div className="space-y-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-start gap-4">
              <div className="relative z-10 flex-shrink-0 mt-0.5 h-6 w-6 rounded-full bg-slate-700 border border-slate-600" />
              <div className="flex-1 min-w-0 space-y-1">
                <div className="h-4 w-24 rounded bg-slate-700" />
                <div className="h-3 w-32 rounded bg-slate-800" />
              </div>
              {i < 4 && (
                <div className="absolute left-[11px] top-6 w-0.5 h-full bg-slate-700/40" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* FundActions skeleton */}
      <div className="no-print flex flex-wrap gap-3 animate-pulse">
        <div className="h-10 w-36 rounded-full bg-slate-700" />
        <div className="h-10 w-24 rounded-full bg-slate-700" />
        <div className="h-10 w-32 rounded-full bg-slate-700" />
      </div>

      <div className="no-print mt-6 rounded-xl border border-slate-800 bg-slate-900/30 p-4 animate-pulse">
        <div className="h-4 w-full max-w-md rounded bg-slate-800" />
      </div>

      <p className="sr-only">Loading invoice details, please wait…</p>
    </div>
  );
}