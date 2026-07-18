import Button from "./Button";

/**
 * Maps a variant string to the human-readable label shown above the error
 * title. All recognised values are listed in {@link VARIANT_LABELS}.
 *
 * @param {string} variant - One of `"server"`, `"validation"`, or `"error"`.
 * @returns {string} The display label.
 */
const VARIANT_LABELS = {
  validation: "Validation error",
  error: "Error",
  server: "Server error",
};

/**
 * Accessible error banner used throughout the app to surface recoverable
 * errors.  Renders an icon, a variant label badge, a title, a description,
 * optional detail text, and an optional action button.
 *
 * The root element carries `role="alert"` and `aria-live="assertive"` so
 * screen readers announce the error immediately when it mounts.
 *
 * @param {object}   props
 * @param {"server"|"validation"|"error"} [props.variant="server"]
 *   Controls the label badge text:
 *   - `"server"`     → "Server error"
 *   - `"validation"` → "Validation error"
 *   - `"error"`      → "Error"
 *   Unknown values fall back to "Server error".
 * @param {string}   [props.title]        Bold heading for the error.
 * @param {string}   [props.description]  Short explanatory paragraph.
 * @param {string}   [props.details]      Optional secondary detail text.
 * @param {string}   [props.actionLabel]  Button label; omit to hide the action button entirely.
 * @param {Function} [props.onAction]     Callback invoked when the action button is clicked.
 * @param {string}   [props.previewLabel="Preview only"]
 *   Badge text rendered next to the variant label.
 */
export default function ErrorBanner({
  variant = "server",
  title,
  description,
  details,
  actionLabel,
  onAction,
  previewLabel = "Preview only",
}) {
  const variantLabel = VARIANT_LABELS[variant] ?? VARIANT_LABELS.server;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="rounded-3xl border border-red-500/30 bg-red-500/10 p-5 text-slate-50 shadow-sm sm:p-6"
    >
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-red-500/20 text-red-200 ring-1 ring-red-300/30">
          <span aria-hidden="true" className="text-lg font-semibold">
            !
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-3">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-red-200">
              {variantLabel}
            </p>
            <span className="rounded-full bg-slate-800/80 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-300">
              {previewLabel}
            </span>
          </div>
          <h2 className="mt-3 text-xl font-semibold text-white">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">{description}</p>
          {details ? <p className="mt-3 text-sm leading-6 text-slate-400">{details}</p> : null}
        </div>
      </div>
      {actionLabel ? (
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button variant="primary" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
