"use client";

/**
 * EmptyState
 *
 * A reusable empty-state panel with an optional icon slot, heading, description,
 * and an action element (link or button).
 *
 * @param {object}    props
 * @param {ReactNode} [props.icon]        - Decorative icon / SVG; rendered inside a
 *                                          centred icon well.  Should include
 *                                          aria-hidden="true" on the SVG itself.
 * @param {string}    props.title         - Heading text shown below the icon.
 * @param {string}    [props.description] - Optional supporting paragraph.
 * @param {ReactNode} [props.action]      - CTA rendered below the description
 *                                          (e.g. a <Link> or <button>).
 * @param {string}    [props.className]   - Additional classes applied to the root.
 */
export default function EmptyState({ icon, title, description, action, className = "" }) {
  return (
    <div
      className={[
        "flex flex-col items-center justify-center gap-6",
        "rounded-3xl border border-slate-800 bg-slate-900/40 p-10 text-center",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {icon && (
        <div className="flex items-center justify-center rounded-full bg-slate-800/70 p-5 ring-1 ring-slate-700/60">
          {icon}
        </div>
      )}

      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-slate-100">{title}</h3>
        {description && <p className="text-sm text-slate-400 max-w-xs mx-auto">{description}</p>}
      </div>

      {action && <div>{action}</div>}
    </div>
  );
}

/**
 * InvoiceEmptyIllustration
 *
 * Decorative inline SVG of an empty document tray.  Always rendered with
 * aria-hidden="true" so screen readers skip it.
 */
export function InvoiceEmptyIllustration() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 80 80"
      width="64"
      height="64"
      aria-hidden="true"
      focusable="false"
      className="text-cyan-500/70"
    >
      {/* Tray body */}
      <rect x="10" y="18" width="60" height="48" rx="6" fill="currentColor" opacity="0.12" />
      <rect
        x="10"
        y="18"
        width="60"
        height="48"
        rx="6"
        stroke="currentColor"
        strokeWidth="2.5"
        fill="none"
      />

      {/* Tray inner shelf */}
      <path d="M10 52 h60" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3" />

      {/* Document icon centred in tray */}
      <rect x="28" y="24" width="24" height="30" rx="3" fill="currentColor" opacity="0.18" />
      <rect
        x="28"
        y="24"
        width="24"
        height="30"
        rx="3"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      {/* Folded corner */}
      <polyline points="44,24 44,32 52,32" stroke="currentColor" strokeWidth="2" fill="none" />
      {/* Text lines on doc */}
      <line
        x1="33"
        y1="38"
        x2="47"
        y2="38"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <line
        x1="33"
        y1="43"
        x2="43"
        y2="43"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />

      {/* Up-arrow indicating upload */}
      <polyline
        points="40,10 40,18"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <polyline
        points="36,14 40,10 44,14"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
