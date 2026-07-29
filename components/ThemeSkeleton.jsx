/**
 * @file components/ThemeSkeleton.jsx
 * Content-shaped loading skeleton for the theme / settings view.
 *
 * Mirrors the layout of the settings page theme section so there is no
 * layout shift when the real content mounts. Any structural change to
 * ThemeInputs, ThemeToggle, or the settings page layout must be reflected
 * here.
 *
 * Accessibility notes:
 * - The decorative pulse shapes are wrapped in `aria-hidden="true"` so
 *   screen readers skip them entirely.
 * - The root wrapper exposes `aria-busy` (controlled via the `isBusy` prop,
 *   default `true`) so live-region–aware ATs know an update is pending.
 * - A `sr-only` sibling announces the loading state to assistive technology.
 *
 * @see components/ThemeInputs.jsx  — canonical theme-inputs markup
 * @see components/ThemeToggle.jsx  — canonical theme-toggle markup
 * @see app/settings/page.js        — settings page layout
 * @see components/WalletSkeleton.jsx — reference skeleton pattern
 */

/**
 * ThemeSkeleton — placeholder shown while the theme / settings view loads.
 *
 * @param {object}  [props]
 * @param {boolean} [props.isBusy=true]  Exposes aria-busy on the wrapper.
 *                                        Pass false once content has settled.
 */
export default function ThemeSkeleton({ isBusy = true }) {
  return (
    <div
      data-testid="theme-skeleton"
      aria-busy={isBusy ? "true" : "false"}
      className="w-full"
    >
      {/* Decorative skeleton shapes — hidden from screen readers */}
      <div aria-hidden="true" className="space-y-6">

        {/* ── Page header: title + subtitle ── */}
        <div className="mb-8 space-y-2">
          {/* Page title */}
          <div className="h-8 w-48 rounded bg-slate-700 animate-pulse" />
          {/* Page subtitle */}
          <div className="h-4 w-72 rounded bg-slate-800 animate-pulse" />
        </div>

        {/* ── Settings card ── */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-4 sm:p-6 space-y-6">

          {/* ── Row 1: Display name field (mirrors InlineEditRow) ── */}
          <div className="flex flex-col gap-2 py-2">
            {/* Label */}
            <div className="h-3.5 w-28 rounded bg-slate-700 animate-pulse" />
            {/* Description */}
            <div className="h-3 w-64 rounded bg-slate-800 animate-pulse" />
            {/* Value / input placeholder */}
            <div className="h-9 w-full max-w-sm rounded-lg bg-slate-800 animate-pulse" />
          </div>

          {/* Divider */}
          <div className="h-px bg-slate-800" />

          {/* ── Row 2: Email field (mirrors InlineEditRow) ── */}
          <div className="flex flex-col gap-2 py-2">
            {/* Label */}
            <div className="h-3.5 w-20 rounded bg-slate-700 animate-pulse" />
            {/* Description */}
            <div className="h-3 w-56 rounded bg-slate-800 animate-pulse" />
            {/* Value / input placeholder */}
            <div className="h-9 w-full max-w-sm rounded-lg bg-slate-800 animate-pulse" />
          </div>
        </div>

        {/* ── Theme preferences card (mirrors ThemeInputs) ── */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 space-y-4">
          {/* Section heading */}
          <div className="h-5 w-40 rounded bg-slate-700 animate-pulse" />

          {/* Theme mode select */}
          <div className="space-y-2">
            <div className="h-3.5 w-16 rounded bg-slate-700 animate-pulse" />
            <div className="h-9 w-full rounded-lg bg-slate-800 animate-pulse" />
            <div className="h-3 w-52 rounded bg-slate-800 animate-pulse" />
          </div>

          {/* Accent colour select */}
          <div className="space-y-2">
            <div className="h-3.5 w-24 rounded bg-slate-700 animate-pulse" />
            <div className="h-9 w-full rounded-lg bg-slate-800 animate-pulse" />
            <div className="h-3 w-44 rounded bg-slate-800 animate-pulse" />
          </div>

          {/* Save button placeholder */}
          <div className="h-10 w-36 rounded-xl bg-slate-700 animate-pulse" />
        </div>

        {/* ── Theme toggle row ── */}
        <div className="flex items-center gap-3">
          {/* Toggle button pill */}
          <div className="h-9 w-9 rounded-lg bg-slate-800 animate-pulse" />
          {/* "Last updated" label */}
          <div className="h-3 w-28 rounded bg-slate-800 animate-pulse" />
        </div>
      </div>

      {/* Screen-reader announcement */}
      <span className="sr-only">Theme settings loading, please wait…</span>
    </div>
  );
}
