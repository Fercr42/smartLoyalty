// Programa de lealtad del negocio. Tres formas, a elección del dueño:
//   sellos:   1 sello por visita (el empleado solo escanea).
//   puntos:   cada compra suma según su monto ("100 puntos por cada 5.000").
//   cashback: cada compra devuelve un % en dinero, que el cliente usa después.
// Se guarda en companies/{id}.loyalty y se usa en el navegador y en el servidor.

export type LoyaltyMode = "stamps" | "points" | "cashback";
export type PointsRule = { points: number; per: number };
export type LoyaltyConfig = { mode: LoyaltyMode; rule: PointsRule; percent: number; currency: string };

export const LOYALTY_MODES: LoyaltyMode[] = ["stamps", "points", "cashback"];
export const DEFAULT_MODE: LoyaltyMode = "points";
export const DEFAULT_RULE: PointsRule = { points: 100, per: 5000 };
export const DEFAULT_PERCENT = 5;
export const MAX_SALE = 100_000_000; // tope por compra, para que un error de dedo no dispare el saldo

const int = (value: unknown, fallback: number, min: number, max: number) => {
  const n = Math.round(Number(value));
  return Number.isFinite(n) && n >= min && n <= max ? n : fallback;
};

export function cleanLoyalty(raw: unknown): LoyaltyConfig {
  const loyalty = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const rule = (loyalty.rule && typeof loyalty.rule === "object" ? loyalty.rule : {}) as Record<string, unknown>;
  const currency = typeof loyalty.currency === "string" ? loyalty.currency.trim().slice(0, 5) : "";
  const mode = LOYALTY_MODES.find((m) => m === loyalty.mode) ?? DEFAULT_MODE;
  return {
    mode,
    rule: {
      points: int(rule.points, DEFAULT_RULE.points, 1, 100_000),
      per: int(rule.per, DEFAULT_RULE.per, 1, 1_000_000),
    },
    percent: int(loyalty.percent, DEFAULT_PERCENT, 1, 50),
    currency: currency || "$",
  };
}

// En sellos y cashback no hay "puntos por monto", pero el cálculo vive en un solo lugar.
export function earnedFor(sale: number, loyalty: LoyaltyConfig) {
  if (loyalty.mode === "stamps") return 1;
  if (!Number.isFinite(sale) || sale <= 0) return 0;
  const amount = Math.min(sale, MAX_SALE);
  if (loyalty.mode === "cashback") return Math.floor((amount * loyalty.percent) / 100);
  return Math.floor((amount * loyalty.rule.points) / loyalty.rule.per);
}

// El escáner pide el monto de la compra en puntos y cashback; en sellos no hace falta.
export const needsSale = (mode: LoyaltyMode) => mode !== "stamps";

// El saldo de cashback es dinero, así que se escribe con la moneda del negocio.
export function formatBalance(value: number, loyalty: LoyaltyConfig, locale = "es") {
  const locales: Record<string, string> = { es: "es-ES", en: "en-US", th: "th-TH" };
  const number = value.toLocaleString(locales[locale] ?? "es-ES");
  return loyalty.mode === "cashback" ? `${loyalty.currency}${number}` : number;
}

// Compatibilidad: antes solo existían puntos.
export const pointsFor = (sale: number, rule: PointsRule) =>
  earnedFor(sale, { mode: "points", rule, percent: DEFAULT_PERCENT, currency: "$" });
