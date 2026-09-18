import { cookies, headers } from "next/headers";
import type { NextRequest } from "next/server";
import { LOCALE_COOKIE, pickLocale, type Locale } from "./config";
import { messages } from "./messages";

// Idioma en páginas del servidor (layout, metadata).
export async function getI18n() {
  const [c, h] = await Promise.all([cookies(), headers()]);
  const locale = pickLocale(c.get(LOCALE_COOKIE)?.value, h.get("accept-language"));
  return { locale, m: messages[locale] };
}

// Idioma en las rutas /api (el navegador manda la cookie en cada fetch).
export function requestI18n(req: NextRequest) {
  const locale = pickLocale(req.cookies.get(LOCALE_COOKIE)?.value, req.headers.get("accept-language"));
  return { locale, m: messages[locale] };
}

export const messagesFor = (locale: Locale) => messages[locale];
