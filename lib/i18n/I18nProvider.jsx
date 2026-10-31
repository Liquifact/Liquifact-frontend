"use client";

import { createContext, useCallback, useContext, useMemo } from "react";
import { DEFAULT_LOCALE, getDictionary, t } from "./index.js";

const I18nContext = createContext({ locale: DEFAULT_LOCALE, dict: getDictionary(DEFAULT_LOCALE) });

export function I18nProvider({ locale, dict, children }) {
  const value = useMemo(() => ({ locale, dict }), [locale, dict]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useLocale() {
  return useContext(I18nContext).locale;
}

export function useT() {
  const { locale, dict } = useContext(I18nContext);
  return useCallback((key, vars) => t(dict, key, { locale, ...vars }), [locale, dict]);
}
