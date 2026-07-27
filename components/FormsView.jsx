"use client";

import Spinner from "./Spinner";
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
        role="status"
        aria-live="polite"
        aria-busy="true"
        data-testid="forms-view-loading"
        className="flex items-center gap-3 rounded-3xl border border-slate-800 bg-slate-900/40 p-10 text-slate-300"
      >
        <Spinner className="h-5 w-5" />
        <span>Loading forms…</span>
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
