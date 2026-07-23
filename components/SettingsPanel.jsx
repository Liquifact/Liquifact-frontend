"use client";

import { memo, useCallback, useMemo, useState } from "react";
import { copy } from "../app/copy/en";
import { THEMES, THEME_STORAGE_KEY, applyTheme } from "./ThemeToggle";

export const SETTINGS_STORAGE_KEY = "liquifact-settings";

export function readStoredSettings() {
  try {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    // localStorage unavailable
  }
  return {};
}

export function writeStoredSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore write failures
  }
}

export function SettingsRow({ label, description, children }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/50 px-5 py-4">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-slate-100">{label}</div>
        {description && (
          <div className="mt-0.5 text-xs text-slate-400">{description}</div>
        )}
      </div>
      <div className="ml-4 flex-shrink-0">{children}</div>
    </div>
  );
}

export const MemoizedSettingsRow = memo(SettingsRow);

function ThemeSelector({ preference, onChange }) {
  const handleChange = useCallback(
    (e) => {
      const next = e.target.value;
      applyTheme(next);
      onChange(next);
    },
    [onChange],
  );

  return (
    <div className="flex gap-2" role="radiogroup" aria-label={copy.settings.themeLabel}>
      {THEMES.map((theme) => (
        <label
          key={theme}
          className={`cursor-pointer rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
            preference === theme
              ? "border-cyan-500 bg-cyan-900/40 text-cyan-300"
              : "border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600 hover:text-slate-300"
          }`}
        >
          <input
            type="radio"
            name="theme"
            value={theme}
            checked={preference === theme}
            onChange={handleChange}
            className="sr-only"
          />
          {theme === "light"
            ? copy.settings.themeLight
            : theme === "dark"
              ? copy.settings.themeDark
              : copy.settings.themeSystem}
        </label>
      ))}
    </div>
  );
}

const MemoizedThemeSelector = memo(ThemeSelector);

function CompactToggle({ compact, onChange }) {
  const handleChange = useCallback(
    (e) => {
      onChange(e.target.checked);
    },
    [onChange],
  );

  return (
    <label className="relative inline-flex cursor-pointer items-center">
      <input
        type="checkbox"
        checked={compact}
        onChange={handleChange}
        className="peer sr-only"
        aria-label={copy.settings.compactRows}
      />
      <div className="h-5 w-9 rounded-full bg-slate-700 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-slate-300 after:transition-all after:content-[''] peer-checked:bg-cyan-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-cyan-400" />
    </label>
  );
}

const MemoizedCompactToggle = memo(CompactToggle);

export default function SettingsPanel({ initialTheme, initialCompact }) {
  const [preference, setPreference] = useState(initialTheme);
  const [compact, setCompact] = useState(initialCompact);

  const handleThemeChange = useCallback((next) => {
    setPreference(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // ignore
    }
  }, []);

  const handleCompactChange = useCallback((next) => {
    setCompact(next);
    const existing = readStoredSettings();
    writeStoredSettings({ ...existing, compactRows: next });
  }, []);

  const derived = useMemo(
    () => ({
      themeValue: preference,
      compactValue: compact,
      themeIcon:
        preference === "light"
          ? "\u2600"
          : preference === "dark"
            ? "\uD83C\uDF19"
            : "\uD83D\uDDA5",
    }),
    [preference, compact],
  );

  const rows = useMemo(
    () => (
      <div className="space-y-3">
        <MemoizedSettingsRow
          label={copy.settings.themeLabel}
          description={copy.settings.themeDesc}
        >
          <MemoizedThemeSelector
            preference={derived.themeValue}
            onChange={handleThemeChange}
          />
        </MemoizedSettingsRow>
        <MemoizedSettingsRow
          label={copy.settings.displayLabel}
          description={copy.settings.compactRowsDesc}
        >
          <MemoizedCompactToggle
            compact={derived.compactValue}
            onChange={handleCompactChange}
          />
        </MemoizedSettingsRow>
      </div>
    ),
    [derived.themeValue, derived.compactValue, handleThemeChange, handleCompactChange],
  );

  return (
    <div>
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {copy.settings.announceThemeChanged.replace("{theme}", derived.themeValue)}
      </div>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-100">
          {copy.settings.title}
        </h2>
        <p className="mt-1 text-sm text-slate-400">{copy.settings.description}</p>
      </div>
      {rows}
    </div>
  );
}
