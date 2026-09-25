import { describe, expect, it } from "vitest";
import { cleanLoyalty, earnedFor, formatBalance, needsSale } from "../../app/lib/loyalty-mode";

describe("formas del programa de lealtad", () => {
  it("por defecto son puntos, con la regla y la moneda de siempre", () => {
    expect(cleanLoyalty(undefined)).toEqual({ mode: "points", rule: { points: 100, per: 5000 }, percent: 5, currency: "$" });
  });

  it("corrige un modo inventado y un porcentaje fuera de rango", () => {
    expect(cleanLoyalty({ mode: "regalos", percent: 800 }).mode).toBe("points");
    expect(cleanLoyalty({ mode: "cashback", percent: 800 }).percent).toBe(5);
    expect(cleanLoyalty({ mode: "cashback", percent: 12 }).percent).toBe(12);
  });

  it("sellos: 1 por visita, sin importar el monto", () => {
    const sellos = cleanLoyalty({ mode: "stamps" });
    expect(earnedFor(0, sellos)).toBe(1);
    expect(earnedFor(50_000, sellos)).toBe(1);
    expect(needsSale("stamps")).toBe(false);
  });

  it("puntos: proporcional al monto", () => {
    const puntos = cleanLoyalty({ mode: "points", rule: { points: 100, per: 5000 } });
    expect(earnedFor(12_000, puntos)).toBe(240);
    expect(earnedFor(0, puntos)).toBe(0);
    expect(needsSale("points")).toBe(true);
  });

  it("cashback: devuelve el porcentaje en dinero y se escribe con la moneda", () => {
    const cash = cleanLoyalty({ mode: "cashback", percent: 10, currency: "₡" });
    expect(earnedFor(12_500, cash)).toBe(1250);
    expect(formatBalance(1250, cash)).toBe("₡1250");
    expect(formatBalance(12_500, cash)).toBe("₡12.500");
    expect(formatBalance(12_500, cleanLoyalty({ mode: "points" }))).toBe("12.500");
  });
});
