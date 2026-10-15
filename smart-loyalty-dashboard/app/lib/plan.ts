// Plan del negocio: prueba gratis, activo (PayPal, SINPE Móvil o activado a mano) o vencido.
// Lo escribe solo el servidor (ver firestore.rules). Se usa en el navegador y en el servidor.

export const TRIAL_DAYS = 14;
export const PAYMENT_GRACE_DAYS = 5; // días de gracia si un cobro se atrasa
const DAY = 86_400_000;

// Los tres planes. El anual se paga como 10 meses (2 gratis).
export type Tier = "esencial" | "pro" | "multi";
export const TIERS: Tier[] = ["esencial", "pro", "multi"];
export const PLANS: Record<Tier, { usd: number; crc: number; locales: number }> = {
  esencial: { usd: 39, crc: 17_900, locales: 1 },
  pro: { usd: 79, crc: 35_900, locales: 1 },
  multi: { usd: 149, crc: 67_900, locales: 3 },
};
export const EXTRA_LOCAL = { usd: 39, crc: 17_900 }; // cada local de más en Multi-local
export const ANNUAL_MONTHS = 10;
export const ENTRY_PRICE_USD = PLANS.esencial.usd; // "desde" en la página principal
export const isTier = (v: unknown): v is Tier => typeof v === "string" && (TIERS as string[]).includes(v);

export type Period = "month" | "year";
export const priceCrc = (tier: Tier, period: Period) => PLANS[tier].crc * (period === "year" ? ANNUAL_MONTHS : 1);
export const priceUsd = (tier: Tier, period: Period) => PLANS[tier].usd * (period === "year" ? ANNUAL_MONTHS : 1);

// Lo que permite cada plan. La prueba gratis y los planes viejos sin tier (US$100) tienen todo lo de Pro.
export type Features = {
  campaignsPerMonth: number | null; // notificaciones manuales al mes (null = sin límite)
  segments: boolean; // enviar a frecuentes, inactivos, cerca del premio
  scheduling: boolean; // programar envíos
  coupons: boolean;
  birthday: boolean;
  winback: boolean; // "te extrañamos"
  reviews: boolean; // pedir reseña después de la visita
  ai: boolean;
};
const FULL: Features = { campaignsPerMonth: null, segments: true, scheduling: true, coupons: true, birthday: true, winback: true, reviews: true, ai: true };
export const FEATURES: Record<Tier, Features> = {
  esencial: { campaignsPerMonth: 4, segments: false, scheduling: false, coupons: false, birthday: false, winback: false, reviews: false, ai: false },
  pro: FULL,
  multi: FULL,
};
export const UPGRADE_MESSAGE = "Esta función es del plan Pro. Cámbiate de plan en la sección Tu plan del panel.";

export type Plan = {
  status?: string;
  tier?: string;
  period?: string;
  trialEndsAt?: number;
  paidUntil?: number;
  provider?: string;
  subscriptionId?: string;
  canceled?: boolean;
  paymentFailed?: boolean;
};

export type PlanState = {
  status: "none" | "trial" | "active" | "expired";
  tier: Tier;
  features: Features;
  daysLeft: number;
  allowed: boolean;
  paidUntil?: number;
  provider?: string;
  canceled?: boolean;
  paymentFailed?: boolean;
};

export function planState(plan?: Plan | null, now = Date.now()): PlanState {
  // En prueba: todo lo de Pro. Pagado sin tier (precio único anterior): Pro.
  const tier: Tier = plan?.status !== "trial" && isTier(plan?.tier) ? plan.tier : "pro";
  const base = { tier, features: FEATURES[tier] };
  if (!plan?.status) return { ...base, status: "none", daysLeft: 0, allowed: false };

  if (plan.status === "active") {
    // Activado a mano (sin fecha de pago): siempre activo.
    if (!plan.paidUntil) return { ...base, status: "active", daysLeft: 0, allowed: true, provider: plan.provider };
    const allowed = plan.paidUntil + PAYMENT_GRACE_DAYS * DAY > now;
    return {
      ...base,
      status: allowed ? "active" : "expired",
      daysLeft: Math.max(0, Math.ceil((plan.paidUntil - now) / DAY)),
      allowed,
      paidUntil: plan.paidUntil,
      provider: plan.provider,
      canceled: Boolean(plan.canceled),
      paymentFailed: Boolean(plan.paymentFailed),
    };
  }

  if (plan.status === "trial") {
    const left = (plan.trialEndsAt ?? 0) - now;
    return left > 0
      ? { ...base, status: "trial", daysLeft: Math.ceil(left / DAY), allowed: true }
      : { ...base, status: "expired", daysLeft: 0, allowed: false };
  }

  return { ...base, status: "expired", daysLeft: 0, allowed: false, provider: plan.provider, canceled: Boolean(plan.canceled) };
}

// Fin del periodo pagado: suma un mes o un año desde hoy o desde el fin del periodo que aún no vence.
export function extendPaidUntil(current: number | undefined, period: Period, now = Date.now()) {
  const start = new Date(Math.max(now, current ?? 0));
  const end = new Date(start);
  if (period === "year") end.setFullYear(end.getFullYear() + 1);
  else end.setMonth(end.getMonth() + 1);
  return end.getTime();
}

export const PLAN_EXPIRED_MESSAGE =
  "Tu plan no está activo. Actívalo en la sección Tu plan del panel para seguir enviando notificaciones.";
