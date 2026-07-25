/**
 * Renders the visible toast notification stack. Extracted from ToastProvider
 * so it can be wrapped in ToastErrorBoundary and swapped out independently in
 * tests without affecting the rest of the app tree.
 */
export function ToastStack({
  toasts,
  variantStyles,
  containerRef,
  pauseToast,
  resumeToast,
  dismissAndReturnFocus,
  recordPreDismissFocus,
}) {
  return (
    <div
      aria-live="polite"
      role="status"
      ref={containerRef}
      className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4 sm:justify-end sm:px-6"
    >
      <div className="flex w-full max-w-md flex-col gap-3">
        {toasts.map((toast) => {
          const variant = variantStyles[toast.variant] || variantStyles.info;

          return (
            <div
              key={toast.id}
              // tabIndex={0} makes the card itself focusable so keyboard users can
              // reach it via Tab and then use Escape to dismiss without having to
              // navigate to the Close button first.
              tabIndex={0}
              onMouseEnter={() => pauseToast(toast.id)}
              onMouseLeave={() => resumeToast(toast.id)}
              // Mirror hover pause/resume for keyboard users: focusing the card (or
              // any element inside it) pauses the timer; blurring resumes it.
              onFocus={(e) => {
                // Record the previously-focused element the first time focus enters
                // this toast so we can restore it on dismissal.
                if (!containerRef.current?.contains(e.relatedTarget)) {
                  recordPreDismissFocus(e.relatedTarget);
                }
                pauseToast(toast.id);
              }}
              onBlur={(e) => {
                // Only resume if focus has left this toast entirely (not just moved
                // between the card and its Close button).
                if (!containerRef.current?.contains(e.relatedTarget)) {
                  resumeToast(toast.id);
                }
              }}
              // Escape dismisses the currently-focused toast, matching common dialog
              // and menu patterns so keyboard users have a single consistent shortcut.
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.preventDefault();
                  dismissAndReturnFocus(toast.id);
                }
              }}
              className={`pointer-events-auto overflow-hidden rounded-3xl border p-4 shadow-2xl shadow-slate-950/30 transition duration-200 ${variant.base}`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 text-xl" aria-hidden="true">
                  {variant.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-100">{toast.title}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-300">{toast.message}</p>
                </div>
                <button
                  type="button"
                  className="rounded-full border border-slate-700/80 bg-slate-950/70 px-2.5 py-1 text-xs font-semibold text-slate-100 outline-none transition duration-150 hover:bg-slate-900 focus-visible:ring-2 focus-visible:ring-cyan-400"
                  aria-label="Dismiss notification"
                  onClick={() => dismissAndReturnFocus(toast.id)}
                >
                  Close
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
