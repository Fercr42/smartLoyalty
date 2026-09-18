"use client";
import { createContext, useCallback, useContext, useMemo } from "react";
import { useRouter } from "next/navigation";
import { translateError } from "./errors";
import { DATE_LOCALE, fmt, LOCALE_COOKIE, LOCALE_NAMES, LOCALES, type Locale } from "./config";
import type { Messages } from "./messages/es";

type I18n = { locale: Locale; m: Messages };
const I18nContext = createContext<I18n | null>(null);

export function I18nProvider({ locale, messages, children }: { locale: Locale; messages: Messages; children: React.ReactNode }) {
  const value = useMemo(() => ({ locale, m: messages }), [locale, messages]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n needs I18nProvider");
  // Mismo objeto mientras no cambie el idioma: se puede usar en dependencias de hooks.
  return useMemo(() => ({
    ...ctx,
    f: fmt,
    dateLocale: DATE_LOCALE[ctx.locale],
    // Traduce los mensajes de error que manda el servidor (en español).
    te: (message?: string | null) => translateError(ctx.locale, message),
  }), [ctx]);
}

export function useSetLocale() {
  const router = useRouter();
  return useCallback(
    (locale: Locale) => {
      document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
      document.documentElement.lang = locale;
      router.refresh();
    },
    [router]
  );
}

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { locale, m } = useI18n();
  const setLocale = useSetLocale();
  return (
    <select
      id="language-switcher"
      aria-label={m.common.language}
      value={locale}
      onChange={(e) => setLocale(e.target.value as Locale)}
      className={`text-sm bg-transparent border rounded-lg px-2 py-1.5 cursor-pointer ${className}`}
    >
      {LOCALES.map((l) => (
        <option key={l} value={l}>
          {LOCALE_NAMES[l]}
        </option>
      ))}
    </select>
  );
}
