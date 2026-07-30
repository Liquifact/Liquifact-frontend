/**
 * @file components/HealthStatusSkeleton.jsx
 * Loading skeleton for the home page API health status card.
 *
 * Mirrors the layout of the health status card rendered in app/page.js
 * (status badge, summary lines, message line, details toggle) so there is
 * no layout shift when the real content mounts.
 *
 * Accessibility notes:
 * - The decorative shapes are wrapped in aria-hidden="true" so screen
 *   readers skip them.
 * - The sibling <span className="sr-only"> announces the busy state to
 *   assistive technology.
 * - The wrapping element exposes aria-busy="true" while isBusy is true.
 *
 * @see app/page.js — canonical health status card markup
 */

export default function HealthStatusSkeleton({ isBusy = true }) {
  return (
    <div
      data-testid="health-status-skeleton"
      aria-busy={isBusy ? "true" : "false"}
      className="mt-4"
    >
      <div
        aria-hidden="true"
        className="rounded-lg border border-slate-700 bg-slate-800/50 p-4 animate-pulse"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="h-6 w-24 rounded-md bg-slate-700" />
        </div>
        <div className="space-y-2 mb-3">
          <div className="h-3 w-40 rounded bg-slate-700" />
          <div className="h-3 w-32 rounded bg-slate-700" />
        </div>
        <div className="h-4 w-56 rounded bg-slate-700 mb-3" />
        <div className="h-3 w-20 rounded bg-slate-700" />
      </div>
      <span className="sr-only">Loading API status…</span>
    </div>
  );
}
