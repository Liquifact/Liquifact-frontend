export default function ErrorBanner({
  variant = "server",
  title,
  description,
  details,
  actionLabel,
  onAction,
  previewLabel = "Preview only",
}) {
  const variantLabel = variant === "validation" ? "Validation error" : "Server error";
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
          <button
            type="button"
            onClick={onAction}
            className="inline-flex items-center justify-center rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-400 focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:ring-offset-slate-950"
          >
            {actionLabel}
          </button>
        </div>
      ) : null}
    </div>
  );
}
