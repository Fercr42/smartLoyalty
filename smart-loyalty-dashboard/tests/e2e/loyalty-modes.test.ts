import crypto from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { api, cleanup, createCompany, hasCredentials, staffHeaders } from "./helpers";

describe.skipIf(!hasCredentials)("Sellos, puntos y cashback", () => {
  afterAll(cleanup);

  it("sellos: 1 por visita, sin monto", async () => {
    const companyId = await createCompany({
      loyalty: { mode: "stamps", rewards: [{ id: "a", title: "Café", stamps: 5 }] },
    });
    const staff = await staffHeaders(companyId);
    const member = crypto.randomUUID();
    await api("/api/loyalty/member", { body: { companyId, memberId: member } });

    let r = await api("/api/loyalty/staff", { body: { action: "stamp", companyId, memberId: member }, headers: staff });
    expect(r.data.stamps).toBe(1);
    r = await api("/api/loyalty/staff", { body: { action: "stamp", companyId, memberId: member, force: true }, headers: staff });
    expect(r.data.stamps).toBe(2);
  });

  it("cashback: devuelve el % y se puede usar todo el saldo", async () => {
    const companyId = await createCompany({
      loyalty: { mode: "cashback", percent: 10, currency: "₡", rewards: [{ id: "a", title: "Postre", stamps: 3000 }] },
    });
    const staff = await staffHeaders(companyId);
    const member = crypto.randomUUID();
    await api("/api/loyalty/member", { body: { companyId, memberId: member } });

    let r = await api("/api/loyalty/staff", { body: { action: "stamp", companyId, memberId: member, sale: 20000 }, headers: staff });
    expect(r.data.stamps).toBe(2000);

    // Sin monto no devuelve nada.
    r = await api("/api/loyalty/staff", { body: { action: "stamp", companyId, memberId: member, force: true }, headers: staff });
    expect(r.status).toBe(400);

    r = await api("/api/loyalty/staff", { body: { action: "cashout", companyId, memberId: member }, headers: staff });
    expect(r.data.stamps).toBe(0);

    // Sin saldo no se puede usar de nuevo.
    r = await api("/api/loyalty/staff", { body: { action: "cashout", companyId, memberId: member }, headers: staff });
    expect(r.status).toBe(400);
  });

  it("puntos: no deja usar el saldo como cashback", async () => {
    const companyId = await createCompany({ loyalty: { mode: "points", rewards: [{ id: "a", title: "Bebida", stamps: 500 }] } });
    const staff = await staffHeaders(companyId);
    const member = crypto.randomUUID();
    await api("/api/loyalty/member", { body: { companyId, memberId: member } });
    await api("/api/loyalty/staff", { body: { action: "stamp", companyId, memberId: member, sale: 50000 }, headers: staff });

    const r = await api("/api/loyalty/staff", { body: { action: "cashout", companyId, memberId: member }, headers: staff });
    expect(r.status).toBe(400);
  });
});
