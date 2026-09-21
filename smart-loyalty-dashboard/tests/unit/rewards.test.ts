import { describe, expect, it } from "vitest";
import { cleanRewards, nextRewardText } from "../../app/lib/rewards";
import { messages } from "../../app/i18n/messages";
import { cleanLoyalty, DEFAULT_RULE, pointsFor } from "../../app/lib/loyalty-mode";

const t = messages.es.rewardText;

describe("cleanRewards", () => {
  it("limpia textos, convierte números, ordena por sellos y descarta inválidos", () => {
    const rewards = cleanRewards([
      { id: "b", title: "Platillo", stamps: 10 },
      { id: "a", title: "  Bebida ", stamps: "5" },
      { title: "", stamps: 3 },
      { title: "Cero", stamps: 0 },
      { title: "Demasiado", stamps: 1_000_001 },
    ]);
    expect(rewards).toEqual([
      { id: "a", title: "Bebida", stamps: 5 },
      { id: "b", title: "Platillo", stamps: 10 },
    ]);
  });

  it("acepta máximo 5 premios", () => {
    const many = Array.from({ length: 7 }, (_, i) => ({ id: `r${i}`, title: `Premio ${i}`, stamps: i + 1 }));
    expect(cleanRewards(many)).toHaveLength(5);
  });

  it("devuelve vacío si no es una lista", () => {
    expect(cleanRewards(undefined)).toEqual([]);
    expect(cleanRewards({ title: "x" })).toEqual([]);
  });
});

describe("nextRewardText", () => {
  const rewards = [
    { id: "a", title: "Bebida", stamps: 5 },
    { id: "b", title: "Platillo", stamps: 10 },
  ];

  it("dice cuánto falta para el próximo premio", () => {
    expect(nextRewardText(rewards, 3, t)).toBe("Bebida · faltan 2");
  });

  it("avisa el premio disponible más alto", () => {
    expect(nextRewardText(rewards, 7, t)).toBe("Premio disponible: Bebida");
    expect(nextRewardText(rewards, 12, t)).toBe("Premio disponible: Platillo");
    expect(nextRewardText(rewards, 3, messages.en.rewardText)).toBe("Bebida · 2 to go");
  });

  it("sin premios no dice nada", () => {
    expect(nextRewardText([], 4, t)).toBe("");
  });
});

describe("puntos por monto de compra", () => {
  const rule = { points: 1000, per: 5000 };

  it("da puntos proporcionales al monto", () => {
    expect(pointsFor(5000, rule)).toBe(1000);
    expect(pointsFor(12000, rule)).toBe(2400);
    expect(pointsFor(2500, rule)).toBe(500);
    expect(pointsFor(0, rule)).toBe(0);
    expect(pointsFor(-100, rule)).toBe(0);
  });

  it("corrige una configuración inválida", () => {
    expect(cleanLoyalty({})).toEqual({ rule: DEFAULT_RULE, currency: "$" });
    expect(cleanLoyalty({ rule: { points: 0, per: -3 }, currency: " ₡ " })).toEqual({ rule: DEFAULT_RULE, currency: "₡" });
  });
});
