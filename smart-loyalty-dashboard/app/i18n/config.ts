// Idiomas del producto. El idioma se toma de la cookie "lang" (selector) o del navegador.

export const LOCALES = ["es", "en", "th"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "es";
export const LOCALE_COOKIE = "lang";

export const LOCALE_NAMES: Record<Locale, string> = { es: "Español", en: "English", th: "ไทย" };

// Para fechas y números (toLocaleString).
export const DATE_LOCALE: Record<Locale, string> = { es: "es", en: "en-US", th: "th-TH" };

export const isLocale = (v: unknown): v is Locale => typeof v === "string" && (LOCALES as readonly string[]).includes(v);

// Cookie primero; si no hay, el primer idioma soportado del navegador ("th-TH,th;q=0.9,en;q=0.8").
export function pickLocale(cookie?: string | null, acceptLanguage?: string | null): Locale {
  if (isLocale(cookie)) return cookie;
  for (const part of (acceptLanguage ?? "").split(",")) {
    const code = part.split(";")[0].trim().slice(0, 2).toLowerCase();
    if (isLocale(code)) return code;
  }
  return DEFAULT_LOCALE;
}

// "Hola {name}" + { name: "Ana" } -> "Hola Ana"
export const fmt = (text: string, vars: Record<string, string | number> = {}) =>
  text.replace(/\{(\w+)\}/g, (match, key) => (key in vars ? String(vars[key]) : match));

// Idioma guardado del negocio (para mensajes automáticos y Google Wallet).
export const companyLocale = (data?: { language?: unknown } | null): Locale =>
  isLocale(data?.language) ? data.language : DEFAULT_LOCALE;
