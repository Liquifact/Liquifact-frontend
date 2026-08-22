/**
 * @file components/UploadSkeleton.jsx
 * Content-shaped loading skeleton for the upload view.
 *
 * Mirrors the layout of UploadZone so there is no layout shift when the
 * real component mounts. Any structural change to UploadZone must be
 * reflected here.
 *
 * Accessibility notes:
 * - The root element is aria-hidden="true" so screen readers skip the
 *   decorative placeholder shapes.
 * - The sibling <span className="sr-only"> announces the busy state to
 *   assistive technology.
 * - The wrapping element exposes aria-busy="true" when isBusy is true
 *   (default) so live-region aware ATs know a content update is pending.
 *
 * @see components/UploadZone.jsx — canonical upload markup
 * @see components/InvoiceListSkeleton.jsx — reference skeleton implementation
 */

/**
 * @param {object}  props
 * @param {boolean} [props.isBusy=true]   Exposes aria-busy on the wrapper.
 *                                         Pass false once content has settled.
 */
export default function UploadSkeleton({ isBusy = true }) {
  return (
    <div data-testid="upload-skeleton" aria-busy={isBusy ? "true" : "false"} className="w-full">
      {/* Decorative skeleton shapes — hidden from screen readers */}
      <div aria-hidden="true" className="space-y-4">
        {/* ---- Requirements notice (mirrors FileConstraintNotice) ---- */}
        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4 mb-6 animate-pulse">
          {/* Title bar */}
          <div className="h-3 w-32 rounded bg-slate-700 mb-3" />
          {/* Constraint badges */}
          <div className="flex flex-wrap gap-2 mb-3">
            <div className="h-6 w-20 rounded-full bg-slate-700" />
            <div className="h-6 w-24 rounded-full bg-slate-700" />
            <div className="h-6 w-28 rounded-full bg-slate-700" />
          </div>
          {/* Body text */}
          <div className="h-3 w-full rounded bg-slate-800" />
        </div>

        {/* ---- Drop-zone area ---- */}
        <div className="rounded-xl border-2 border-dashed border-slate-700 p-10 text-center animate-pulse">
          <div className="space-y-4">
            {/* Folder icon placeholder */}
            <div className="h-10 w-10 mx-auto rounded bg-slate-700" />
            {/* Primary prompt */}
            <div className="h-4 w-64 mx-auto rounded bg-slate-700" />
            {/* Secondary prompt */}
            <div className="h-3 w-32 mx-auto rounded bg-slate-800" />
            {/* Badge pills */}
            <div className="flex justify-center gap-2 pt-1">
              <div className="h-5 w-16 rounded-full bg-slate-800" />
              <div className="h-5 w-20 rounded-full bg-slate-800" />
            </div>
          </div>
        </div>

        {/* ---- Submit button placeholder ---- */}
        <div className="mt-4 h-12 w-full rounded-xl bg-slate-800 animate-pulse" />
      </div>

      {/* Screen-reader announcement */}
      <span className="sr-only">Upload form loading, please wait…</span>
    </div>
  );
}
