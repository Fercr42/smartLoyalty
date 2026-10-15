// Plan del restaurante: prueba gratis, activo (pagado con PayPal o activado a mano) o vencido.
// Lo escribe solo el servidor (ver firestore.rules). Se usa en el navegador y en el servidor.

export const TRIAL_DAYS = 14;
export const PLAN_PRICE_USD = 100;
export const PAYMENT_GRACE_DAYS = 5; // días de gracia si PayPal atrasa o reintenta un cobro
const DAY = 86_400_000;

export type Plan = {
  status?: string;
  trialEndsAt?: number;
  paidUntil?: number;
  provider?: string;
  subscriptionId?: string;
  canceled?: boolean;
  paymentFailed?: boolean;
};

export type PlanState = {
  status: "none" | "trial" | "active" | "expired";
  daysLeft: number;
  allowed: boolean;
  paidUntil?: number;
  provider?: string;
  canceled?: boolean;
  paymentFailed?: boolean;
};

export function planState(plan?: Plan | null, now = Date.now()): PlanState {
  if (!plan?.status) return { status: "none", daysLeft: 0, allowed: false };

  if (plan.status === "active") {
    // Activado a mano (sin fecha de pago): siempre activo.
    if (!plan.paidUntil) return { status: "active", daysLeft: 0, allowed: true, provider: plan.provider };
    const allowed = plan.paidUntil + PAYMENT_GRACE_DAYS * DAY > now;
    return {
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
      ? { status: "trial", daysLeft: Math.ceil(left / DAY), allowed: true }
      : { status: "expired", daysLeft: 0, allowed: false };
  }

  return { status: "expired", daysLeft: 0, allowed: false, provider: plan.provider, canceled: Boolean(plan.canceled) };
}

export const PLAN_EXPIRED_MESSAGE =
  "Tu plan no está activo. Actívalo en la sección Tu plan del panel para seguir enviando notificaciones.";
