/**
 * @file components/InvoiceDetailSkeleton.jsx
 * Content-shaped placeholder shown while the invoice detail page is loading.
 *
 * Dimensions deliberately mirror the invoice detail layout so there is no
 * layout shift when the real content replaces the skeleton. Any structural
 * change to `app/invest/[id]/page.js` must be reflected here.
 *
 * @see app/invest/[id]/page.js — canonical detail page markup
 */

export default function InvoiceDetailSkeleton() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100" aria-busy="true">
      <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="h-9 w-28 rounded bg-slate-700 animate-pulse" aria-hidden="true" />
        <div className="h-9 w-32 rounded bg-slate-700 animate-pulse" aria-hidden="true" />
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="h-4 w-36 rounded bg-slate-700 animate-pulse mb-6" aria-hidden="true" />

        <div className="h-8 w-48 rounded bg-slate-700 animate-pulse mb-2" aria-hidden="true" />
        <div
          className="h-4 w-full max-w-xl rounded bg-slate-800 animate-pulse mb-8"
          aria-hidden="true"
        />

        <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 mb-6">
          <div className="h-7 w-40 rounded bg-slate-700 animate-pulse mb-4" aria-hidden="true" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="h-3 w-16 rounded bg-slate-800 animate-pulse" aria-hidden="true" />
                <div className="h-5 w-32 rounded bg-slate-700 animate-pulse" aria-hidden="true" />
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 mb-6">
          <div className="h-5 w-32 rounded bg-slate-700 animate-pulse mb-6" aria-hidden="true" />

          <div className="flex flex-col gap-0">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="relative flex items-start gap-4 pb-6 last:pb-0">
                <div
                  className="h-6 w-6 rounded-full bg-slate-700 animate-pulse flex-shrink-0"
                  aria-hidden="true"
                />
                <div className="flex flex-col min-w-0 gap-1">
                  <div className="h-4 w-24 rounded bg-slate-700 animate-pulse" aria-hidden="true" />
                  <div className="h-3 w-32 rounded bg-slate-800 animate-pulse" aria-hidden="true" />
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="flex flex-wrap gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-11 w-28 rounded-full bg-slate-700 animate-pulse"
              aria-hidden="true"
            />
          ))}
        </div>

        <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900/30 p-4">
          <div className="h-4 w-3/4 rounded bg-slate-800 animate-pulse" aria-hidden="true" />
        </div>
      </main>

      <span className="sr-only">Loading invoice details, please wait…</span>
    </div>
  );
}
