/**
 * @file components/SettingsSkeleton.jsx
 * Content-shaped loading skeleton for the settings view.
 *
 * Mirrors the layout of the settings list section in app/settings/page.js so
 * there is no layout shift when the real rows mount. Mirrors:
 *  - the settings-list rows (label + description + edit control + copy button)
 *  - the "load more" / end-of-list footer
 *  - the count line
 *
 * Accessibility notes:
 * - Decorative pulse shapes are wrapped in `aria-hidden="true"`.
 * - The root exposes `aria-busy` and a screen-reader-only message announces
 *   that settings content is loading.
 *
 * @see app/settings/page.js — canonical settings markup
 * @see components/UploadSkeleton.jsx — reference skeleton implementation
 */

/**
 * @param {object}  props
 * @param {boolean} [props.isBusy=true]   Exposes aria-busy on the wrapper.
 *                                         Pass false once content has settled.
 * @param {number}  [props.rows=4]        Number of settings rows to mirror.
 */
export default function SettingsSkeleton({ isBusy = true, rows = 4 }) {
  const rowCount = Number.isFinite(rows) ? Math.max(1, rows) : 4;

  return (
    <div
      data-testid="settings-skeleton"
      aria-busy={isBusy ? "true" : "false"}
      className="w-full"
    >
      <div aria-hidden="true" className="space-y-4">
        {/* ---- Rows: mirror the settings-list item layout ---- */}
        {Array.from({ length: rowCount }).map((_, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900/40 p-4 animate-pulse"
          >
            {/* Left: label + description */}
            <div className="flex-1 min-w-0 space-y-2">
              <div className="h-4 w-40 rounded bg-slate-700" />
              <div className="h-3 w-64 rounded bg-slate-800" />
            </div>
            {/* Right: inline edit control + copy button */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="h-8 w-24 rounded-lg bg-slate-800" />
              <div className="h-6 w-6 rounded bg-slate-800" />
            </div>
          </div>
        ))}

        {/* ---- Footer: load-more / end-of-list + count ---- */}
        <div className="flex items-center justify-between pt-2">
          <div className="h-9 w-32 rounded-lg bg-slate-800 animate-pulse" />
          <div className="h-3 w-24 rounded bg-slate-800 animate-pulse" />
        </div>
      </div>

      {/* Screen-reader announcement */}
      <span className="sr-only">Settings loading, please wait…</span>
    </div>
  );
}