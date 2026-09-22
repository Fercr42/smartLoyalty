import crypto from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { api, bearer, cleanup, createCompany, hasCredentials, idTokenFor, staffHeaders, uniqueId } from "./helpers";

describe.skipIf(!hasCredentials)("Tarjeta protegida por correo", () => {
  const rewards = { loyalty: { rewards: [{ id: "a", title: "Bebida", stamps: 5 }] } };
  let restaurantA = "";
  let restaurantB = "";
  let customer: Record<string, string> = {};
  let staff: Record<string, string> = {};
  const phone1 = crypto.randomUUID();
  const phone2 = crypto.randomUUID();

  beforeAll(async () => {
    restaurantA = await createCompany(rewards);
    restaurantB = await createCompany(rewards);
    const uid = uniqueId("Cust");
    customer = bearer(await idTokenFor(uid, `${uid.toLowerCase()}@example.com`));
    staff = await staffHeaders(restaurantA);
  });
  afterAll(cleanup);

  it("protege la tarjeta con el correo y comparte el correo si el cliente acepta", async () => {
    await api("/api/loyalty/member", { body: { companyId: restaurantA, memberId: phone1 } });
    await api("/api/loyalty/staff", { body: { action: "stamp", companyId: restaurantA, memberId: phone1, sale: 5000 }, headers: staff });
    await api("/api/loyalty/staff", { body: { action: "stamp", companyId: restaurantA, memberId: phone1, force: true, sale: 5000 }, headers: staff });

    const r = await api("/api/loyalty/link", { headers: customer, body: { companyId: restaurantA, memberId: phone1, shareEmail: true } });
    expect(r.status).toBe(200);
    expect(r.data.memberId).toBe(phone1);
    const card = await api("/api/loyalty/member", { body: { companyId: restaurantA, memberId: phone1 } });
    expect(card.data).toMatchObject({ linked: true, stamps: 200 });
    expect(card.data.email).toContain("@example.com");
  });

  it("en un celular nuevo recupera la tarjeta y suma los puntos", async () => {
    await api("/api/loyalty/member", { body: { companyId: restaurantA, memberId: phone2 } });
    await api("/api/loyalty/staff", { body: { action: "stamp", companyId: restaurantA, memberId: phone2, sale: 5000 }, headers: staff });

    const r = await api("/api/loyalty/link", { headers: customer, body: { companyId: restaurantA, memberId: phone2 } });
    expect(r.data).toMatchObject({ memberId: phone1, merged: true });
    const main = await api("/api/loyalty/member", { body: { companyId: restaurantA, memberId: phone2 } });
    expect(main.data).toMatchObject({ memberId: phone1, stamps: 300 });
  });

  it("el escáner con el QR viejo usa la tarjeta principal", async () => {
    const r = await api("/api/loyalty/staff", { body: { action: "scan", companyId: restaurantA, code: phone2 }, headers: staff });
    expect(r.data.member.memberId).toBe(phone1);
  });

  it("el código de 8 caracteres liga otra app una sola vez", async () => {
    const created = await api("/api/loyalty/pair", { headers: customer, body: { action: "create" } });
    expect(created.data.code).toMatch(/^[A-Z2-9]{8}$/);
    const app = crypto.randomUUID();
    let r = await api("/api/loyalty/pair", { body: { action: "redeem", code: created.data.code, companyId: restaurantA, memberId: app } });
    expect(r.data.memberId).toBe(phone1);
    r = await api("/api/loyalty/pair", { body: { action: "redeem", code: created.data.code, companyId: restaurantA, memberId: app } });
    expect(r.status).toBe(400);
  });

  it("en otro restaurante la cuenta tiene una tarjeta separada", async () => {
    const card = crypto.randomUUID();
    await api("/api/loyalty/link", { headers: customer, body: { companyId: restaurantB, memberId: card } });
    const r = await api("/api/loyalty/member", { body: { companyId: restaurantB, memberId: card } });
    expect(r.data).toMatchObject({ memberId: card, stamps: 0, linked: true, email: null });
  });

  it("otra persona no puede tomar una tarjeta protegida", async () => {
    const other = uniqueId("Other");
    const token = await idTokenFor(other, `${other.toLowerCase()}@example.com`);
    const r = await api("/api/loyalty/link", { headers: bearer(token), body: { companyId: restaurantA, memberId: phone1 } });
    expect(r.status).toBe(409);
  });
});
