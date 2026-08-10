"use client";

import { useCallback, useId, useMemo, useState } from "react";
import Button from "./Button";

/** Valid theme mode options. */
export const THEME_OPTIONS = ["light", "dark", "system"];

/** Valid accent colour options. */
export const ACCENT_COLOUR_OPTIONS = ["cyan", "blue", "green", "purple", "amber", "rose"];

/**
 * Validates the theme preference inputs.
 *
 * Returns an object with error strings or null for each field.
 *
 * @param {string} theme – current theme mode value
 * @param {string} accentColour – current accent colour value
 * @returns {{ theme: string|null, accentColour: string|null }}
 */
export function validateThemeInputs(theme, accentColour) {
  const errors = { theme: null, accentColour: null };

  if (!THEME_OPTIONS.includes(theme)) {
    errors.theme = "Please select a valid theme option (light, dark, or system).";
  }

  if (!ACCENT_COLOUR_OPTIONS.includes(accentColour)) {
    errors.accentColour = "Please select a valid accent colour.";
  }

  return errors;
}

/**
 * ThemeInputs – a controlled form for editing the user's theme preferences.
 *
 * Features:
 * - Validates that both fields contain a value from their allowed set.
 * - Inline error messages linked via `aria-describedby` for screen readers.
 * - Disables the submit button while either field is invalid.
 * - Follows the same patterns as FundAmountInput / WatchlistInput.
 *
 * @param {Object}   props
 * @param {string}   props.initialTheme         – Current theme preference (e.g. "system")
 * @param {string}   props.initialAccentColour  – Current accent colour (e.g. "cyan")
 * @param {Function} [props.onSubmit]           – Called with { theme, accentColour } on submit
 * @param {boolean}  [props.disabled]           – Externally disables the entire control
 */
export default function ThemeInputs({
  initialTheme = "system",
  initialAccentColour = "cyan",
  onSubmit,
  disabled = false,
}) {
  const [theme, setTheme] = useState(initialTheme);
  const [accentColour, setAccentColour] = useState(initialAccentColour);
  const [touchedTheme, setTouchedTheme] = useState(false);
  const [touchedAccent, setTouchedAccent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const themeId = useId();
  const themeErrorId = useId();
  const themeHelperId = useId();
  const accentId = useId();
  const accentErrorId = useId();
  const accentHelperId = useId();

  const errors = useMemo(() => validateThemeInputs(theme, accentColour), [theme, accentColour]);

  const visibleThemeError = touchedTheme ? errors.theme : null;
  const visibleAccentError = touchedAccent ? errors.accentColour : null;

  const isSubmitDisabled =
    disabled || submitting || errors.theme !== null || errors.accentColour !== null;

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setTouchedTheme(true);
      setTouchedAccent(true);

      if (errors.theme !== null || errors.accentColour !== null) return;

      if (onSubmit) {
        setSubmitting(true);
        try {
          await onSubmit({ theme, accentColour });
        } finally {
          setSubmitting(false);
        }
      }
    },
    [errors, onSubmit, theme, accentColour]
  );

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 theme-form-panel"
    >
      <h3 className="text-lg font-semibold text-slate-100 mb-4 theme-form-title">Theme Preferences</h3>

      <div className="mb-4">
        <label htmlFor={themeId} className="block text-sm font-medium text-slate-300 mb-1 theme-form-label">
          Theme
        </label>
        <select
          id={themeId}
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          onBlur={() => setTouchedTheme(true)}
          disabled={disabled || submitting}
          aria-describedby={visibleThemeError ? `${themeHelperId} ${themeErrorId}` : themeHelperId}
          aria-invalid={visibleThemeError ? "true" : "false"}
          className={[
            "w-full rounded-lg border bg-slate-950 px-4 py-2 text-sm text-slate-100",
            "focus:outline-none focus:ring-2",
            visibleThemeError
              ? "border-red-500 focus:ring-red-500"
              : "border-slate-700 focus:ring-cyan-500",
            disabled || submitting ? "opacity-50 cursor-not-allowed" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {THEME_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt.charAt(0).toUpperCase() + opt.slice(1)}
            </option>
          ))}
        </select>
        <p id={themeHelperId} className="mt-1 text-xs text-slate-500 theme-form-helper">
          Light, dark, or follow the operating system setting.
        </p>
        {visibleThemeError && (
          <p
            id={themeErrorId}
            role="alert"
            aria-live="polite"
            className="mt-1 text-xs text-red-400"
          >
            {visibleThemeError}
          </p>
        )}
      </div>

      <div className="mb-6">
        <label htmlFor={accentId} className="block text-sm font-medium text-slate-300 mb-1 theme-form-label">
          Accent Colour
        </label>
        <select
          id={accentId}
          value={accentColour}
          onChange={(e) => setAccentColour(e.target.value)}
          onBlur={() => setTouchedAccent(true)}
          disabled={disabled || submitting}
          aria-describedby={
            visibleAccentError ? `${accentHelperId} ${accentErrorId}` : accentHelperId
          }
          aria-invalid={visibleAccentError ? "true" : "false"}
          className={[
            "w-full rounded-lg border bg-slate-950 px-4 py-2 text-sm text-slate-100",
            "focus:outline-none focus:ring-2",
            visibleAccentError
              ? "border-red-500 focus:ring-red-500"
              : "border-slate-700 focus:ring-cyan-500",
            disabled || submitting ? "opacity-50 cursor-not-allowed" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {ACCENT_COLOUR_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt.charAt(0).toUpperCase() + opt.slice(1)}
            </option>
          ))}
        </select>
        <p id={accentHelperId} className="mt-1 text-xs text-slate-500 theme-form-helper">
          Accent colour used throughout the interface.
        </p>
        {visibleAccentError && (
          <p
            id={accentErrorId}
            role="alert"
            aria-live="polite"
            className="mt-1 text-xs text-red-400"
          >
            {visibleAccentError}
          </p>
        )}
      </div>

      <Button
        type="submit"
        variant="primary"
        loading={submitting}
        disabled={isSubmitDisabled}
        aria-label="Save theme preferences"
      >
        {submitting ? "Saving…" : "Save Preferences"}
      </Button>
    </form>
  );
}
