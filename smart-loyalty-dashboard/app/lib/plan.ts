// Plan del restaurante: prueba gratis o activo. Lo escribe solo el servidor (ver firestore.rules).
// Se usa en el navegador y en el servidor.

export const TRIAL_DAYS = 14;
const DAY = 86_400_000;

export type Plan = { status?: string; trialEndsAt?: number };
export type PlanState = { status: "none" | "trial" | "active" | "expired"; daysLeft: number; allowed: boolean };

export function planState(plan?: Plan | null, now = Date.now()): PlanState {
  if (!plan?.status) return { status: "none", daysLeft: 0, allowed: false };
  if (plan.status === "active") return { status: "active", daysLeft: 0, allowed: true };
  if (plan.status === "trial") {
    const left = (plan.trialEndsAt ?? 0) - now;
    return left > 0
      ? { status: "trial", daysLeft: Math.ceil(left / DAY), allowed: true }
      : { status: "expired", daysLeft: 0, allowed: false };
  }
  return { status: "expired", daysLeft: 0, allowed: false };
}

export const PLAN_EXPIRED_MESSAGE =
  "Tu prueba gratis terminó. Activa tu plan para seguir enviando notificaciones.";
