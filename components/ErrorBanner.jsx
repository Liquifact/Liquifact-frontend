import Button from "./Button";

/**
 * Structured error banner with a variant label, title, description, optional
 * details, and an optional action button.
 *
 * Rendered with `role="alert"` and `aria-live="assertive"` so assistive
 * technologies announce the error immediately when it appears in the DOM.
 *
 * @param {object}   props
 * @param {'server' | 'validation' | 'error'} [props.variant='server']
 *   Controls the label displayed above the title.
 *   - `"server"`     → "Server error"
 *   - `"validation"` → "Validation error"
 *   - `"error"`      → "Error"
 * @param {string}   [props.title]        Bold heading for the error.
 * @param {string}   [props.description]  Short explanatory paragraph.
 * @param {string}   [props.details]      Optional secondary detail text
 *   rendered below the description.
 * @param {string}   [props.actionLabel]  Label for the action button.
 *   Omit (or pass `undefined`) to hide the button entirely.
 * @param {Function} [props.onAction]     Callback fired when the action
 *   button is clicked.
 * @param {string}   [props.previewLabel='Preview only']
 *   Text shown in the small badge next to the variant label.
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
  const variantLabels = {
    validation: "Validation error",
    error: "Error",
    server: "Server error",
  };
  const variantLabel = variantLabels[variant] ?? "Server error";

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
