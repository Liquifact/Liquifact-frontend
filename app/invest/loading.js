"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ErrorBanner from "../../components/ErrorBanner";
import InvoiceListSkeleton from "../../components/InvoiceListSkeleton";
import NavMenuSkeleton from "../../components/NavMenuSkeleton";
import { copy } from "../copy/en";

export const LOADING_RECOVERY_DELAY_MS = 15_000;

/** Number of filter pill skeletons to render (mirrors the real filter panel). */
const FILTER_PILL_COUNT = 4;

/**
 * Route-level loading skeleton for the investor marketplace.
 *
 * Mirrors the page structure of `/invest/page.js`:
 *  1. Sticky nav skeleton (`NavMenuSkeleton`)
 *  2. Page title + subtitle shimmer bars
 *  3. Filter panel skeleton (pill-shaped shimmer chips)
 *  4. Invoice list skeleton (`InvoiceListSkeleton`)
 *
 * The component accepts no props — it is always rendered with identical,
 * deterministic output so tests can assert on its structure reliably.
 *
 * @returns {React.ReactElement}
 */
export default function InvestLoading() {
  const router = useRouter();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setTimedOut(true), LOADING_RECOVERY_DELAY_MS);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <div
      className="min-h-screen bg-slate-950 text-slate-100"
      aria-busy={timedOut ? "false" : "true"}
      data-testid="invest-loading"
    >
      {timedOut ? (
        <main className="mx-auto max-w-4xl px-6 py-12">
          <ErrorBanner
            variant="error"
            title={copy.invest.loadingTimeoutTitle}
            description={copy.invest.loadingTimeoutDescription}
            actionLabel={copy.invest.retryAction}
            onAction={() => router.refresh()}
          />
        </main>
      ) : (
        <>
          <NavMenuSkeleton />

          <main className="max-w-4xl mx-auto px-6 py-12">
            <div className="h-7 w-24 rounded bg-slate-700 animate-pulse mb-2" />
            <div className="h-4 w-full max-w-xl rounded bg-slate-800 animate-pulse mb-2" />
            <div className="h-4 w-3/4 max-w-lg rounded bg-slate-800 animate-pulse mb-8" />

            <div className="mb-8 rounded-xl border border-slate-800 bg-slate-900/30 p-6">
              <div className="flex flex-wrap gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-10 w-32 rounded-lg bg-slate-800 animate-pulse" />
                ))}
              </div>
            </div>

            <InvoiceListSkeleton rows={3} />
          </main>
        </>
      )}
    </div>
  );
}
