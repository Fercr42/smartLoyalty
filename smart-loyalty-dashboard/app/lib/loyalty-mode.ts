// Programa de lealtad: por sellos (1 por visita) o por puntos (según el monto de la compra).
// Se guarda en companies/{id}.loyalty y se usa en el navegador y en el servidor.

export const LOYALTY_MODES = ["stamps", "points"] as const;
export type LoyaltyMode = (typeof LOYALTY_MODES)[number];

// "1000 puntos por cada 5000 de compra".
export type PointsRule = { points: number; per: number };
export type LoyaltyConfig = { mode: LoyaltyMode; rule: PointsRule; currency: string };

export const DEFAULT_RULE: PointsRule = { points: 1000, per: 5000 };
export const MAX_SALE = 100_000_000; // tope por compra, para que un error de dedo no dispare los puntos

const int = (value: unknown, fallback: number, min: number, max: number) => {
  const n = Math.round(Number(value));
  return Number.isFinite(n) && n >= min && n <= max ? n : fallback;
};

export function cleanLoyalty(raw: unknown): LoyaltyConfig {
  const loyalty = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const rule = (loyalty.rule && typeof loyalty.rule === "object" ? loyalty.rule : {}) as Record<string, unknown>;
  const currency = typeof loyalty.currency === "string" ? loyalty.currency.trim().slice(0, 5) : "";
  return {
    mode: loyalty.mode === "points" ? "points" : "stamps",
    rule: {
      points: int(rule.points, DEFAULT_RULE.points, 1, 100_000),
      per: int(rule.per, DEFAULT_RULE.per, 1, 1_000_000),
    },
    currency: currency || "$",
  };
}

// Puntos que gana una compra, proporcional: 12.000 con la regla 1000/5000 da 2.400.
export function pointsFor(sale: number, rule: PointsRule) {
  if (!Number.isFinite(sale) || sale <= 0) return 0;
  return Math.floor((Math.min(sale, MAX_SALE) * rule.points) / rule.per);
}
