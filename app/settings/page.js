"use client";

import { useEffect, useState } from "react";
import { copy } from "../copy/en";
import NavMenu from "../../components/NavMenu";
import { formatRelativeTime } from "../../lib/format/date";
import {
  DEFAULT_SETTINGS,
  readStoredSettings,
  writeStoredSettings,
  readStoredSettingsUpdatedAt,
  writeStoredSettingsUpdatedAt,
} from "../../lib/settingsStore";

const CURRENCY_OPTIONS = [
  { value: "USD", label: "US Dollar (USD)" },
  { value: "EUR", label: "Euro (EUR)" },
  { value: "NGN", label: "Nigerian Naira (NGN)" },
];

/** How often (ms) the relative label re-renders itself while mounted. */
const RELATIVE_LABEL_REFRESH_MS = 60_000;

export default function SettingsPage() {
  const [settings, setSettings] = useState(() => {
    if (typeof window === "undefined") return DEFAULT_SETTINGS;
    return readStoredSettings();
  });
  const [updatedAt, setUpdatedAt] = useState(() => {
    if (typeof window === "undefined") return null;
    return readStoredSettingsUpdatedAt();
  });
  const [hydrated] = useState(() => typeof window !== "undefined");

  // Forces a re-render every minute so the relative label ("2 minutes ago")
  // keeps advancing while the page stays open.
  const [, forceRefresh] = useState(0);
  useEffect(() => {
    const id = setInterval(() => forceRefresh((n) => n + 1), RELATIVE_LABEL_REFRESH_MS);
    return () => clearInterval(id);
  }, []);

  const applyChange = (partial) => {
    const now = Date.now();
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      writeStoredSettings(next);
      return next;
    });
    setUpdatedAt(now);
    writeStoredSettingsUpdatedAt(now);
  };

  const relativeLabel = hydrated ? formatRelativeTime(updatedAt) : null;
  const absoluteLabel = updatedAt ? new Date(updatedAt).toLocaleString() : null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <NavMenu />

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-wrap items-baseline justify-between gap-2">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-slate-100 sm:text-4xl">
              {copy.settings.title}
            </h1>
            <p className="text-lg text-slate-400">{copy.settings.description}</p>
          </div>

          {relativeLabel && (
            <span
              data-testid="settings-updated-at"
              title={`Settings last changed: ${absoluteLabel}`}
              className="text-xs text-slate-500"
            >
              <span aria-hidden="true">
                {copy.settings.lastUpdatedPrefix} {relativeLabel}
              </span>
              <span className="sr-only">{`Settings last changed ${absoluteLabel}`}</span>
            </span>
          )}
        </div>

        <div className="space-y-6 rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="flex flex-col gap-2">
            <label htmlFor="settings-currency" className="text-sm font-medium text-slate-200">
              {copy.settings.currencyLabel}
            </label>
            <select
              id="settings-currency"
              value={settings.currency}
              onChange={(e) => applyChange({ currency: e.target.value })}
              className="focus-ring w-full max-w-xs rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            >
              {CURRENCY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between gap-4 border-t border-slate-800 pt-6">
            <div>
              <p className="text-sm font-medium text-slate-200">
                {copy.settings.emailNotificationsLabel}
              </p>
              <p className="text-xs text-slate-500">{copy.settings.emailNotificationsHint}</p>
            </div>
            <button
              id="settings-email-toggle"
              type="button"
              role="switch"
              aria-checked={settings.emailNotifications}
              aria-label={copy.settings.emailNotificationsLabel}
              onClick={() => applyChange({ emailNotifications: !settings.emailNotifications })}
              className={[
                "focus-ring relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
                settings.emailNotifications ? "bg-cyan-500" : "bg-slate-700",
              ].join(" ")}
            >
              <span
                className={[
                  "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                  settings.emailNotifications ? "translate-x-6" : "translate-x-1",
                ].join(" ")}
              />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}