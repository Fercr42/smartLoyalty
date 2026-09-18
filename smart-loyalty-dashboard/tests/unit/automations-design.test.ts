import { describe, expect, it } from "vitest";
import { automationDefaults, cleanAutomations, fillTemplate } from "../../app/lib/automations-config";
import { messages } from "../../app/i18n/messages";

const defaults = messages.es.automations.defaults;
import { cleanDesign, encodeDesign, templateDesign } from "../../app/lib/card-design";

describe("automatizaciones", () => {
  it("sin ajustes usa los valores por defecto (todo apagado)", () => {
    expect(cleanAutomations({}, defaults)).toEqual(automationDefaults(defaults));
    expect(cleanAutomations({}, messages.th.automations.defaults).winback.title).toBe("คิดถึงนะ");
  });

  it("limita días y limpia textos", () => {
    const clean = cleanAutomations({ winback: { enabled: true, days: 2, couponDays: 500, coupon: "  10% " } }, defaults);
    expect(clean.winback).toMatchObject({ enabled: true, days: 7, couponDays: 60, coupon: "10%" });
  });

  it("reemplaza solo las variables conocidas", () => {
    expect(fillTemplate("Hola desde {restaurante}, {x}", { business: "Rancho" })).toBe("Hola desde Rancho, {x}");
    expect(fillTemplate("{business} · {premio} · {days}", { business: "Leo", reward: "Corte", days: 7 })).toBe("Leo · Corte · 7");
  });
});

describe("diseño de tarjeta", () => {
  it("corrige valores inválidos", () => {
    const design = cleanDesign({ bgColor: "red", font: "comic-sans", bgOverlay: 2, stampIcon: "x", bgImageUrl: "javascript:alert(1)" }, "#123456");
    expect(design).toMatchObject({ bgColor: "#123456", font: "poppins", bgOverlay: 0.8, stampIcon: "circle", bgImageUrl: "" });
  });

  it("las plantillas conservan lo que la marca subió", () => {
    const design = templateDesign("elegant", { bgImageUrl: "/wallet-asset/abc/card-background?v=1" });
    expect(design).toMatchObject({ template: "elegant", bgColor: "#1c1917", bgImageUrl: "/wallet-asset/abc/card-background?v=1" });
  });

  it("la plantilla clásica usa el color de la marca", () => {
    expect(templateDesign("classic", {}, "#abcdef").bgColor).toBe("#abcdef");
  });

  it("la vista previa codifica y decodifica el diseño sin perder datos", () => {
    const design = templateDesign("fun");
    const decoded = JSON.parse(Buffer.from(encodeDesign({ ...design, version: 123 }), "base64").toString("utf8"));
    expect(decoded).toEqual(design);
  });
});
