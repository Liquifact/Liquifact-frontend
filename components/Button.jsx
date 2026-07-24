"use client";

import { forwardRef } from "react";
import Spinner from "./Spinner";

/**
 * @typedef {'primary' | 'secondary' | 'warning' | 'external' | 'danger'} ButtonVariant
 */

/**
 * Shared Button component — unifies all button markup across the app.
 *
 * Replaces copy-pasted buttons in:
 *   - app/page.js (cyan CTA pill)
 *   - app/invest/page.js (disabled filter buttons)
 *   - components/UploadZone.jsx (submit button + inline spinner)
 *   - components/WalletStatus.jsx (variant switch buttons + inline spinner)
 *   - components/ErrorBanner.jsx (action button)
 *
 * All variants share one consistent focus-visible outline (cyan-400, 2px,
 * offset 2px) replacing the divergent focus:ring vs focus-visible:outline
 * styles that existed before.
 *
 * @param {Object} props
 * @param {ButtonVariant} [props.variant='primary'] — Visual style.
 * @param {boolean} [props.loading=false] — Renders Spinner and sets aria-busy.
 * @param {boolean} [props.disabled=false] — Disables interaction.
 * @param {React.ReactNode} [props.children] — Button content.
 * @param {string} [props.className] — Additional Tailwind classes.
 * @param {React.Ref<HTMLButtonElement>} ref — Forwarded ref.
 */

const Button = forwardRef(function Button(
  { variant = "primary", loading = false, disabled = false, children, className = "", ...rest },
  ref
) {
  const isDisabled = disabled || loading;

  // Base styles shared by every variant (focus-ring class centralized in globals.css)
  const baseStyles =
    "inline-flex items-center justify-center gap-2 rounded-full px-4 py-3 " +
    "text-sm font-medium transition-all duration-200 " +
    "focus-ring disabled:opacity-50 disabled:cursor-not-allowed";
  const disabledClasses = isDisabled ? "opacity-50 cursor-not-allowed" : "";

  // Variant-specific styles
  const variantStyles = {
    primary: "bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 active:bg-cyan-500/40",
    secondary: "border border-slate-600 text-slate-300 hover:bg-slate-800 active:bg-slate-700",
    warning: "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 active:bg-amber-500/40",
    external: "bg-violet-500/20 text-violet-400 hover:bg-violet-500/30 active:bg-violet-500/40",
    danger: "bg-red-500/20 text-red-400 hover:bg-red-500/30 active:bg-red-500/40",
  };

  const combinedClassName =
    `${baseStyles} ${variantStyles[variant]} ${disabledClasses} ${className}`.trim();

  return (
    <button
      ref={ref}
      type="button"
      disabled={isDisabled}
      aria-busy={loading}
      className={combinedClassName}
      {...rest}
    >
      {loading && <Spinner className="-ml-1 h-4 w-4" />}
      {children}
    </button>
  );
});

export default Button;
