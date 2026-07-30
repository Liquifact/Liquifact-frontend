"use client";

import EmptyState from "./EmptyState";
import ErrorBanner from "./ErrorBanner";

/**
 * FormsView
 *
 * Renders the forms list in one of four mutually-exclusive states, following
 * the same `status` fetch-state model used elsewhere in the app (loading →
 * error / empty / success):
 *
 *   - `"loading"` — a labelled, `aria-busy` placeholder.
 *   - `"error"`   — an `ErrorBanner` (role="alert", assertive) with a keyboard
 *                   -operable retry control that invokes `onRetry`.
 *   - `"empty"` (or `"loaded"` with no rows) — an `EmptyState`, announced
 *                   politely so assistive tech is not left with a blank panel.
 *   - `"loaded"` (with rows) — the forms list.
 *
 * Only one state renders at a time, so assistive tech never encounters more
 * than one live region for this view.
 *
 * @param {object}   props
 * @param {'loading'|'error'|'empty'|'loaded'} [props.status='loaded']
 * @param {Array<{id:string, title: string}>} [props.data=[]]
 * @param {{message?: string}|null} [props.error=null]
 * @param {Function} [props.onRetry] — Called when the user activates the
 *   retry button. Should re-trigger whatever fetched the forms list.
 */
export default function FormsView({ status = "loaded", data = [], error = null, onRetry }) {
  if (status === "loading") {
    return (
      <div
        aria-busy="true"
        data-testid="forms-view-loading"
        className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 sm:p-8"
      >
        <div className="space-y-5" aria-hidden="true">
          <div className="space-y-3">
            <div className="h-6 w-24 rounded bg-slate-700/80 animate-pulse" />
            <div className="h-4 w-full max-w-md rounded bg-slate-800 animate-pulse" />
          </div>

          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={`forms-skeleton-row-${index}`}
                className="rounded-2xl border border-slate-800/80 bg-slate-950/40 p-4"
              >
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 shrink-0 rounded-2xl bg-slate-800 animate-pulse" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="h-4 w-3/5 rounded bg-slate-700 animate-pulse" />
                    <div className="h-3 w-2/5 rounded bg-slate-800 animate-pulse" />
                  </div>
                  <div className="h-9 w-24 shrink-0 rounded-full bg-slate-800 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <span className="sr-only">Loading forms, please wait…</span>
      </div>
    );
  }

  if (status === "error") {
    return (
      <ErrorBanner
        variant="server"
        title="Unable to load forms"
        description={error?.message || "Something went wrong while loading your forms."}
        actionLabel="Retry"
        onAction={onRetry}
      />
    );
  }

  if (status === "empty" || (status === "loaded" && data.length === 0)) {
    return (
      <div role="status" aria-live="polite">
        <EmptyState
          title="No forms yet"
          description="Forms you create or submit will show up here."
        />
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-100">Forms</h2>
      <ul className="mt-3 space-y-2">
        {data.map((item, index) => (
          <li key={index} className="text-slate-200">
            {item.title}
          </li>
        ))}
      </ul>
    </div>
  );
}
