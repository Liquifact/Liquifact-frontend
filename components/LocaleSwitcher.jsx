"use client";

import { useRouter } from "next/navigation";
import { LOCALE_COOKIE, LOCALE_NAMES, SUPPORTED_LOCALES } from "@/lib/i18n";
import { useLocale, useT } from "./I18nProvider";

export default function LocaleSwitcher() {
  const router = useRouter();
  const locale = useLocale();
  const t = useT();

  function onChange(e) {
    document.cookie = `${LOCALE_COOKIE}=${e.target.value}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }

  return (
    <select aria-label={t("footer.language")} value={locale} onChange={onChange}>
      {SUPPORTED_LOCALES.map((l) => (
        <option key={l} value={l}>{LOCALE_NAMES[l]}</option>
      ))}
    </select>
  );
}
