"use client";
import { useEffect, useState } from "react";
import { THEME_KEY, readPref, resolveTheme } from "@/lib/theme";

const OPTIONS = [["light", "Light"], ["dark", "Dark"], ["system", "System"]];
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
  const [pref, setPref] = useState("system"); // matches server render

  useEffect(() => setPref(readPref(window.localStorage)), []);

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
  }

  return (
    <div className="theme-toggle" role="radiogroup" aria-label="Theme">
      {OPTIONS.map(([value, label]) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={pref === value}
          onClick={() => choose(value)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
