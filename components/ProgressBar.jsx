"use client";

/**
 * ProgressBar — reusable accessible determinate progress indicator.
 *
 * Renders a visible bar with ARIA attributes for screen readers.
 * Respects `prefers-reduced-motion` by disabling bar transitions.
 *
 * @param {Object} props
 * @param {number} props.value - Current progress value (0 to max).
 * @param {number} [props.max=100] - Maximum progress value.
 * @param {string} [props.label] - Accessible label text (e.g. "Uploading invoice").
 * @param {string} [props.className] - Additional CSS classes for the outer container.
 */
export default function ProgressBar({ value, max = 100, label, className = "" }) {
  const clamped = Math.min(Math.max(value, 0), max);
  const percentage = Math.round((clamped / max) * 100);

  return (
    <div className={className}>
      <div
        role="progressbar"
        aria-valuemin="0"
        aria-valuemax={max}
        aria-valuenow={percentage}
        aria-label={label ? `${label} ${percentage}%` : undefined}
        className="h-1.5 w-full overflow-hidden rounded-full bg-cyan-950/50"
      >
        <div
          className="h-full bg-cyan-400 transition-all duration-300 motion-reduce:transition-none"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="sr-only">
        {percentage}% uploaded
      </span>
    </div>
  );
}
