"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLocale, useT } from "@/lib/i18n/I18nProvider";
import { LOCALE_COOKIE, SUPPORTED_LOCALES, getDictionary, t as translate } from "@/lib/i18n/index.js";

const ONE_YEAR = 60 * 60 * 24 * 365;

export default function LocaleSwitcher() {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const [announcement, setAnnouncement] = useState("");

  function onChange(event) {
    const next = event.target.value;
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
    // Announce in the newly selected language, not the one being left.
    const nextDict = getDictionary(next);
    setAnnouncement(translate(nextDict, "locale.changed", { language: translate(nextDict, `locale.${next}`) }));
    router.refresh();
  }

  return (
    <div className="locale-switcher">
      <label htmlFor="locale-select">{t("locale.label")}</label>
      <select id="locale-select" value={locale} onChange={onChange}>
        {SUPPORTED_LOCALES.map((code) => (
          <option key={code} value={code} lang={code}>
            {t(`locale.${code}`)}
          </option>
        ))}
      </select>
      <span className="sr-only" role="status" aria-live="polite">{announcement}</span>
    </div>
  );
}
