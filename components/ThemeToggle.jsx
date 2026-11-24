"use client";
import { useEffect, useState } from "react";
import { THEME_KEY, readPref, resolveTheme } from "@/lib/theme";
import { LOCAL_DATA_CHANGED_EVENT } from "@/lib/localData";
import { useT } from "@/lib/i18n/I18nProvider";

const OPTIONS = [
  ["light", "theme.light"],
  ["dark", "theme.dark"],
  ["system", "theme.system"],
];
const CHROME = { light: "#f7f8fc", dark: "#0a0e1f" };
const mq = () => window.matchMedia("(prefers-color-scheme: dark)");

function apply(pref) {
  const theme = resolveTheme(pref, mq().matches);
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  document
    .querySelectorAll('meta[name="theme-color"]')
    .forEach((m) => m.setAttribute("content", CHROME[theme]));
}

export default function ThemeToggle() {
  const t = useT();
  const [pref, setPref] = useState("system"); // matches server render

  // eslint-disable-next-line react-hooks/set-state-in-effect -- Read theme preference from localStorage on mount
  useEffect(() => {
    const sync = () => {
      let storage;
      try { storage = window.localStorage; } catch { storage = null; }
      setPref(readPref(storage));
    };
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener(LOCAL_DATA_CHANGED_EVENT, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(LOCAL_DATA_CHANGED_EVENT, sync);
    };
  }, []);

  useEffect(() => {
    if (pref !== "system") return;
    const m = mq();
    const onChange = () => apply("system");
    m.addEventListener("change", onChange);
    return () => m.removeEventListener("change", onChange);
  }, [pref]);

  function choose(next) {
    setPref(next);
    try { window.localStorage.setItem(THEME_KEY, next); } catch {}
    apply(next);
    window.dispatchEvent(new CustomEvent(LOCAL_DATA_CHANGED_EVENT, { detail: { keys: [THEME_KEY] } }));
  }

  return (
    <div className="theme-toggle" role="radiogroup" aria-label={t("theme.label")}>
      {OPTIONS.map(([value, key]) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={pref === value}
          onClick={() => choose(value)}
        >
          {t(key)}
        </button>
      ))}
    </div>
  );
}