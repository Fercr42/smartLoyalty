import crypto from "node:crypto";
import { Timestamp } from "firebase-admin/firestore";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { api, cleanup, createCompany, db, hasCredentials, staffHeaders } from "./helpers";

describe.skipIf(!hasCredentials)("Sellos, premios y cupones", () => {
  let companyId = "";
  let staff: Record<string, string> = {};
  const member = crypto.randomUUID();

  beforeAll(async () => {
    companyId = await createCompany({
      loyalty: { rewards: [{ id: "a", title: "Bebida", stamps: 2 }, { id: "b", title: "Platillo", stamps: 3 }] },
    });
    staff = await staffHeaders(companyId);
  });
  afterAll(cleanup);

  it("crea la tarjeta del cliente con 0 sellos", async () => {
    const r = await api("/api/loyalty/member", { body: { companyId, memberId: member } });
    expect(r.status).toBe(200);
    expect(r.data).toMatchObject({ enabled: true, stamps: 0, code: member.slice(0, 8).toUpperCase() });
  });

  it("rechaza un PIN incorrecto", async () => {
    const r = await api("/api/loyalty/staff", { body: { action: "login", companyId, pin: "0000" } });
    expect(r.status).toBe(401);
  });

  it("encuentra la tarjeta por código de 8 caracteres y por QR", async () => {
    const byCode = await api("/api/loyalty/staff", { body: { action: "scan", companyId, code: member.slice(0, 8).toUpperCase() }, headers: staff });
    expect(byCode.data.member?.memberId).toBe(member);
    const byQr = await api("/api/loyalty/staff", { body: { action: "scan", companyId, code: member }, headers: staff });
    expect(byQr.data.member?.memberId).toBe(member);
  });

  it("suma sellos y bloquea un segundo sello inmediato", async () => {
    let r = await api("/api/loyalty/staff", { body: { action: "stamp", companyId, memberId: member }, headers: staff });
    expect(r.data.stamps).toBe(1);
    r = await api("/api/loyalty/staff", { body: { action: "stamp", companyId, memberId: member }, headers: staff });
    expect(r.status).toBe(409);
    await api("/api/loyalty/staff", { body: { action: "stamp", companyId, memberId: member, force: true }, headers: staff });
    r = await api("/api/loyalty/staff", { body: { action: "stamp", companyId, memberId: member, force: true }, headers: staff });
    expect(r.data.stamps).toBe(3);
  });

  it("canjea un premio y rechaza si no alcanzan los sellos", async () => {
    let r = await api("/api/loyalty/staff", { body: { action: "redeem", companyId, memberId: member, rewardId: "b" }, headers: staff });
    expect(r.data.stamps).toBe(0);
    r = await api("/api/loyalty/staff", { body: { action: "redeem", companyId, memberId: member, rewardId: "a" }, headers: staff });
    expect(r.status).toBe(400);
  });

  it("guarda visitas e historial", async () => {
    const m = (await db().collection("companies").doc(companyId).collection("walletMembers").doc(member).get()).data();
    expect(m).toMatchObject({ stamps: 0, totalVisits: 3 });
    const events = await db().collection("companies").doc(companyId).collection("loyaltyEvents").get();
    expect(events.size).toBe(4);
  });

  it("rechaza una sesión de empleado falsa", async () => {
    const r = await api("/api/loyalty/staff", { body: { action: "stamp", companyId, memberId: member }, headers: { "X-Staff-Token": "falso.token" } });
    expect(r.status).toBe(401);
  });

  it("un cupón se usa una sola vez", async () => {
    const coupon = db().collection("companies").doc(companyId).collection("coupons").doc();
    await coupon.set({ title: "20% prueba", expiresAt: Timestamp.fromMillis(Date.now() + 86_400_000), expiresDate: "2099-01-01", active: true, redemptions: 0 });
    const scan = await api("/api/loyalty/staff", { body: { action: "scan", companyId, code: member }, headers: staff });
    expect(scan.data.coupons).toEqual([expect.objectContaining({ id: coupon.id, used: false })]);
    let r = await api("/api/loyalty/staff", { body: { action: "coupon", companyId, memberId: member, couponId: coupon.id }, headers: staff });
    expect(r.status).toBe(200);
    r = await api("/api/loyalty/staff", { body: { action: "coupon", companyId, memberId: member, couponId: coupon.id }, headers: staff });
    expect(r.status).toBe(409);
  });
});

describe.skipIf(!hasCredentials)("Puntos por monto de compra", () => {
  afterAll(cleanup);

  it("suma puntos según el monto y descuenta al canjear", async () => {
    const companyId = await createCompany({
      loyalty: {
        mode: "points",
        rule: { points: 1000, per: 5000 },
        currency: "₡",
        rewards: [{ id: "a", title: "Postre", stamps: 8000 }],
      },
    });
    const staff = await staffHeaders(companyId);
    const member = crypto.randomUUID();
    await api("/api/loyalty/member", { body: { companyId, memberId: member } });

    let r = await api("/api/loyalty/staff", { body: { action: "stamp", companyId, memberId: member, sale: 12000 }, headers: staff });
    expect(r.data).toMatchObject({ stamps: 2400, mode: "points" });

    // Sin monto no suma nada.
    r = await api("/api/loyalty/staff", { body: { action: "stamp", companyId, memberId: member, force: true }, headers: staff });
    expect(r.status).toBe(400);

    r = await api("/api/loyalty/staff", { body: { action: "stamp", companyId, memberId: member, sale: 30000, force: true }, headers: staff });
    expect(r.data.stamps).toBe(8400);

    r = await api("/api/loyalty/staff", { body: { action: "redeem", companyId, memberId: member, rewardId: "a" }, headers: staff });
    expect(r.data.stamps).toBe(400);
  });
});
