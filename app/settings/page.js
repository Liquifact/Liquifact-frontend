"use client";

import NavMenu from "../../components/NavMenu";
import SettingsPanel, { readStoredSettings } from "../../components/SettingsPanel";
import { readStoredTheme, THEMES } from "../../components/ThemeToggle";
import { copy } from "../copy/en";

export default function SettingsPage() {
  const initialTheme =
    typeof window === "undefined"
      ? "system"
      : THEMES.includes(readStoredTheme())
        ? readStoredTheme()
        : "system";

  const initialCompact =
    typeof window === "undefined" ? false : Boolean(readStoredSettings().compactRows);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <NavMenu />

      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="space-y-2 mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-slate-100 sm:text-4xl">
            {copy.settings.title}
          </h1>
          <p className="text-lg text-slate-400">{copy.settings.description}</p>
        </div>

        <SettingsPanel initialTheme={initialTheme} initialCompact={initialCompact} />
      </main>
    </div>
  );
}
