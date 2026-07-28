/**
 * @file app/invoices/loading.js
 * Next.js route-level loading UI for the /invoices page.
 *
 * Rendered automatically by the Next.js App Router while the page segment
 * is streaming. Delegates the upload area skeleton to the reusable
 * UploadSkeleton component so both share the same markup and stay in sync.
 *
 * @see components/UploadSkeleton.jsx — reusable upload skeleton
 */
import UploadSkeleton from "../../components/UploadSkeleton";

export default function InvoicesLoading() {
  return (
    <div
      className="min-h-screen bg-slate-950 text-slate-100"
      aria-busy="true"
      data-testid="invoices-loading"
    >
      {/* ---- Header ---- */}
      <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="inline-block py-3 text-xl font-semibold tracking-tight text-transparent bg-slate-700 rounded w-28 animate-pulse">
          ← LiquiFact
        </div>
        <div className="h-11 w-36 rounded-full bg-slate-800 animate-pulse" />
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* ---- Page title ---- */}
        <div className="h-7 w-28 rounded bg-slate-700 animate-pulse mb-6" />
        {/* ---- Subtitle lines ---- */}
        <div className="h-4 w-full max-w-xl rounded bg-slate-800 animate-pulse mb-2" />
        <div className="h-4 w-2/3 max-w-lg rounded bg-slate-800 animate-pulse mb-8" />

        {/* ---- Reusable upload skeleton ---- */}
        <UploadSkeleton isBusy={true} />
      </main>
    </div>
  );
}
