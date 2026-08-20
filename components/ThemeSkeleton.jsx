/**
 * @file components/ThemeSkeleton.jsx
 * Content-shaped loading skeleton for the theme / settings view.
 *
 * The default page variant mirrors the settings page theme section. The
 * compact control variant reserves the same frame used by ThemeToggle so the
 * skeleton can be replaced after hydration without moving surrounding layout.
 *
 * Accessibility notes:
 * - Decorative pulse shapes are wrapped in `aria-hidden="true"`.
 * - The root exposes `role="status"`, `aria-live="polite"`, and `aria-busy`.
 * - A screen-reader-only message announces that theme content is loading.
 *
 * @see components/ThemeInputs.jsx
 * @see components/ThemeToggle.jsx
 * @see app/settings/page.js
 */

export const THEME_CONTROL_FRAME_CLASS = "inline-flex h-9 w-[15rem] items-center";

/**
 * ThemeSkeleton — placeholder shown while theme content loads.
 *
 * @param {object} [props]
 * @param {boolean} [props.isBusy=true]
 * @param {"page"|"control"} [props.variant="page"]
 */
export default function ThemeSkeleton({ isBusy = true, variant = "page" }) {
  if (variant === "control") {
    return (
      <div
        data-testid="theme-skeleton"
        data-variant="control"
        role="status"
        aria-live="polite"
        aria-busy={isBusy ? "true" : "false"}
        className={THEME_CONTROL_FRAME_CLASS}
      >
        <div aria-hidden="true" className="flex h-9 w-full items-center gap-2">
          <div className="h-9 w-9 shrink-0 rounded-lg bg-slate-800 animate-pulse" />
          <div className="h-8 w-8 shrink-0 rounded-lg bg-slate-800 animate-pulse" />
          <div className="h-3 min-w-0 flex-1 rounded bg-slate-800 animate-pulse" />
          <div className="h-8 w-8 shrink-0 rounded-lg bg-slate-800 animate-pulse" />
        </div>
        <span className="sr-only">Theme controls loading, please wait…</span>
      </div>
    );
  }

  return (
    <div
      data-testid="theme-skeleton"
      data-variant="page"
      role="status"
      aria-live="polite"
      aria-busy={isBusy ? "true" : "false"}
      className="w-full"
    >
      <div aria-hidden="true" className="space-y-6">
        <div className="mb-8 space-y-2">
          <div className="h-8 w-48 rounded bg-slate-700 animate-pulse" />
          <div className="h-4 w-72 rounded bg-slate-800 animate-pulse" />
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-4 sm:p-6 space-y-6">
          <div className="flex flex-col gap-2 py-2">
            <div className="h-3.5 w-28 rounded bg-slate-700 animate-pulse" />
            <div className="h-3 w-64 rounded bg-slate-800 animate-pulse" />
            <div className="h-9 w-full max-w-sm rounded-lg bg-slate-800 animate-pulse" />
          </div>

          <div className="h-px bg-slate-800" />

          <div className="flex flex-col gap-2 py-2">
            <div className="h-3.5 w-20 rounded bg-slate-700 animate-pulse" />
            <div className="h-3 w-56 rounded bg-slate-800 animate-pulse" />
            <div className="h-9 w-full max-w-sm rounded-lg bg-slate-800 animate-pulse" />
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 space-y-4">
          <div className="h-5 w-40 rounded bg-slate-700 animate-pulse" />

          <div className="space-y-2">
            <div className="h-3.5 w-16 rounded bg-slate-700 animate-pulse" />
            <div className="h-9 w-full rounded-lg bg-slate-800 animate-pulse" />
            <div className="h-3 w-52 rounded bg-slate-800 animate-pulse" />
          </div>

          <div className="space-y-2">
            <div className="h-3.5 w-24 rounded bg-slate-700 animate-pulse" />
            <div className="h-9 w-full rounded-lg bg-slate-800 animate-pulse" />
            <div className="h-3 w-44 rounded bg-slate-800 animate-pulse" />
          </div>

          <div className="h-10 w-36 rounded-xl bg-slate-700 animate-pulse" />
        </div>

        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-slate-800 animate-pulse" />
          <div className="h-3 w-28 rounded bg-slate-800 animate-pulse" />
        </div>
      </div>

      <span className="sr-only">Theme settings loading, please wait…</span>
    </div>
  );
}
