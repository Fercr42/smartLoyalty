import { describe, expect, it } from "vitest";
import { PAYMENT_GRACE_DAYS, planState } from "../../app/lib/plan";

const NOW = Date.UTC(2026, 8, 14, 12);
const DAY = 86_400_000;

describe("planState", () => {
  it("sin plan: no registrado", () => {
    expect(planState(undefined, NOW)).toMatchObject({ status: "none", allowed: false });
  });

  it("prueba vigente cuenta los días que quedan", () => {
    expect(planState({ status: "trial", trialEndsAt: NOW + 2.5 * DAY }, NOW)).toMatchObject({
      status: "trial",
      daysLeft: 3,
      allowed: true,
    });
  });

  it("prueba vencida bloquea", () => {
    expect(planState({ status: "trial", trialEndsAt: NOW - 1 }, NOW)).toMatchObject({ status: "expired", allowed: false });
  });

  it("activo a mano sin fecha sigue activo", () => {
    expect(planState({ status: "active" }, NOW)).toMatchObject({ status: "active", allowed: true });
  });

  it("pago atrasado tiene días de gracia", () => {
    const withinGrace = planState({ status: "active", provider: "paypal", paidUntil: NOW - (PAYMENT_GRACE_DAYS - 1) * DAY }, NOW);
    expect(withinGrace).toMatchObject({ status: "active", allowed: true });
    const pastGrace = planState({ status: "active", provider: "paypal", paidUntil: NOW - (PAYMENT_GRACE_DAYS + 1) * DAY }, NOW);
    expect(pastGrace).toMatchObject({ status: "expired", allowed: false });
  });

  it("cancelado conserva acceso hasta la fecha pagada", () => {
    expect(planState({ status: "active", provider: "paypal", paidUntil: NOW + 10 * DAY, canceled: true }, NOW)).toMatchObject({
      status: "active",
      allowed: true,
      canceled: true,
      daysLeft: 10,
    });
  });

  it("estado desconocido se trata como vencido", () => {
    expect(planState({ status: "raro" }, NOW)).toMatchObject({ status: "expired", allowed: false });
  });
});
