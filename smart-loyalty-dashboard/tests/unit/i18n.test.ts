import { describe, expect, it } from "vitest";
import { companyLocale, fmt, pickLocale } from "../../app/i18n/config";
import { translateError } from "../../app/i18n/errors";
import { messages } from "../../app/i18n/messages";

// Todas las rutas de texto (a.b.c) de un diccionario.
const paths = (obj: unknown, prefix = ""): string[] =>
  obj && typeof obj === "object" && !Array.isArray(obj)
    ? Object.entries(obj).flatMap(([k, v]) => paths(v, prefix ? `${prefix}.${k}` : k))
    : [prefix];

describe("idiomas", () => {
  it("elige la cookie, luego el navegador y si no, español", () => {
    expect(pickLocale("th", "en-US")).toBe("th");
    expect(pickLocale(null, "th-TH,th;q=0.9,en;q=0.8")).toBe("th");
    expect(pickLocale(undefined, "fr-FR,en;q=0.5")).toBe("en");
    expect(pickLocale("xx", "de-DE")).toBe("es");
    expect(companyLocale({ language: "en" })).toBe("en");
    expect(companyLocale({ language: "fr" })).toBe("es");
  });

  it("inglés y tailandés tienen los mismos textos que español, sin vacíos", () => {
    const es = paths(messages.es).sort();
    for (const locale of ["en", "th"] as const) {
      expect(paths(messages[locale]).sort()).toEqual(es);
      const empty = paths(messages[locale]).filter((p) => {
        const value = p.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], messages[locale]);
        return typeof value === "string" && !value.trim() && !p.endsWith("labels");
      });
      expect(empty).toEqual([]);
    }
  });

  it("las variables {x} coinciden entre idiomas", () => {
    const vars = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort().join(",");
    for (const p of paths(messages.es)) {
      const get = (l: "es" | "en" | "th") => p.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], messages[l]);
      const es = get("es");
      if (typeof es !== "string" || p.startsWith("automations.defaults") || p === "automations.varsList") continue;
      expect(vars(get("en") as string), `en ${p}`).toBe(vars(es));
      expect(vars(get("th") as string), `th ${p}`).toBe(vars(es));
    }
  });

  it("rellena variables y traduce errores del servidor", () => {
    expect(fmt("Hola {name}, {x}", { name: "Ana" })).toBe("Hola Ana, {x}");
    expect(translateError("en", "PIN incorrecto")).toBe("Wrong PIN");
    expect(translateError("th", "Llegaste al máximo de 20 usos de IA de hoy. Mañana se renueva.")).toContain("20");
    expect(translateError("es", "PIN incorrecto")).toBe("PIN incorrecto");
    expect(translateError("en", "Mensaje nuevo")).toBe("Mensaje nuevo");
  });
});
