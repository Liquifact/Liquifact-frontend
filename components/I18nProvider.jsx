"use client";

import { createContext, useCallback, useContext, useMemo } from "react";
import { t as translate } from "@/lib/i18n";

const I18nContext = createContext(null);

export default function I18nProvider({ locale, dict, children }) {
  const value = useMemo(() => ({ locale, dict }), [locale, dict]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useT/useLocale must be used inside <I18nProvider>");
  return ctx;
}

export function useT() {
  const { dict } = useI18n();
  return useCallback((key, vars) => translate(dict, key, vars), [dict]);
}

export function useLocale() {
  return useI18n().locale;
}
