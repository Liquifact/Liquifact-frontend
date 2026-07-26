"use client";

/**
 * @file components/DensityToggle.jsx
 *
 * A two-state toggle (compact / comfortable) for the invoice-detail page.
 *
 * Usage modes
 * ─────────────
 * 1. **Uncontrolled** (no props): the component calls `useDensity()` itself,
 *    owns the state, and persists to localStorage.  Use this when the toggle
 *    is the sole consumer of density state.
 *
 * 2. **Controlled** (density + onDensityChange props): the parent manages
 *    state via `useDensity()` and passes the value down.  Use this when the
 *    parent also needs to react to density changes (e.g. to change spacing).
 *
 * Accessibility
 * ─────────────
 * • A visible label associates the control group with a `role="group"` wrapper.
 * • Each button carries an explicit `aria-label` and `aria-pressed` so screen
 *   readers announce both the control name and its active state.
 * • Focus styling follows the project's `.focus-ring` pattern.
 *
 * @param {object}   [props]
 * @param {string}   [props.className]         Additional classes for the root element.
 * @param {string}   [props.density]           Controlled density value ("compact"|"comfortable").
 * @param {function} [props.onDensityChange]   Callback when the user selects a density.
 */

import { useDensity } from "@/lib/hooks/useDensity";
import { copy } from "@/app/copy/en";

const detail = copy.invest.detail;

export default function DensityToggle({ className = "", density: controlledDensity, onDensityChange }) {
  const [internalDensity, setInternalDensity] = useDensity();

  // When controlled props are provided, use them; otherwise use the internal hook state.
  const isControlled = controlledDensity !== undefined && onDensityChange !== undefined;
  const density = isControlled ? controlledDensity : internalDensity;
  const handleSelect = isControlled ? onDensityChange : setInternalDensity;

  return (
    <div
      role="group"
      aria-label={detail.densityToggleLabel}
      className={["flex items-center gap-2 text-sm", className].filter(Boolean).join(" ")}
    >
      {/* Visible label for sighted users */}
      <span
        id="density-toggle-label"
        className="text-slate-400 select-none"
        aria-hidden="true"
      >
        {detail.densityToggleLabel}:
      </span>

      {/* Compact button */}
      <button
        type="button"
        onClick={() => handleSelect("compact")}
        aria-pressed={density === "compact"}
        aria-label={detail.densityCompactAriaLabel}
        data-density="compact"
        className={[
          "rounded px-3 py-1 text-xs font-medium transition-colors",
          "focus-ring",
          density === "compact"
            ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40"
            : "border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-500",
        ].join(" ")}
      >
        {detail.densityCompact}
      </button>

      {/* Comfortable button */}
      <button
        type="button"
        onClick={() => handleSelect("comfortable")}
        aria-pressed={density === "comfortable"}
        aria-label={detail.densityComfortableAriaLabel}
        data-density="comfortable"
        className={[
          "rounded px-3 py-1 text-xs font-medium transition-colors",
          "focus-ring",
          density === "comfortable"
            ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40"
            : "border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-500",
        ].join(" ")}
      >
        {detail.densityComfortable}
      </button>
    </div>
  );
}
