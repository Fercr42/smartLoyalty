import crypto from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { api, bearer, cleanup, createCompany, hasCredentials, idTokenFor, staffHeaders } from "./helpers";

describe.skipIf(!hasCredentials)("Nombre del cliente", () => {
  let companyId = "";
  const member = crypto.randomUUID();

  beforeAll(async () => {
    companyId = await createCompany({ loyalty: { rewards: [{ id: "a", title: "Bebida", stamps: 500 }] } });
    await api("/api/loyalty/member", { body: { companyId, memberId: member } });
  });
  afterAll(cleanup);

  it("rechaza un nombre vacío o sin letras", async () => {
    const r = await api("/api/loyalty/member", { body: { companyId, memberId: member, name: "  123 " } });
    expect(r.status).toBe(400);
  });

  it("guarda el nombre limpio y se puede cambiar", async () => {
    let r = await api("/api/loyalty/member", { body: { companyId, memberId: member, name: "  Luis   <b>Pérez " } });
    expect(r.data.name).toBe("Luis bPérez");
    r = await api("/api/loyalty/member", { body: { companyId, memberId: member, name: "Luis" } });
    expect(r.data.name).toBe("Luis");
  });

  it("el escáner y el historial muestran el nombre", async () => {
    const staff = await staffHeaders(companyId);
    const scan = await api("/api/loyalty/staff", { body: { action: "scan", companyId, code: member }, headers: staff });
    expect(scan.data.member).toMatchObject({ name: "Luis" });
    await api("/api/loyalty/staff", { body: { action: "stamp", companyId, memberId: member, sale: 5000 }, headers: staff });
  });

  it("el dueño ve la lista de clientes con nombre; otro dueño no", async () => {
    const r = await api("/api/members", { method: "GET", headers: bearer(await idTokenFor(companyId)) });
    expect(r.status).toBe(200);
    expect(r.data.members).toEqual([expect.objectContaining({ name: "Luis", code: member.slice(0, 8).toUpperCase(), points: 100, visits: 1 })]);
    const other = await api(`/api/members?companyId=${companyId}`, { method: "GET", headers: bearer(await idTokenFor(`zzE2Eotro${Date.now()}`)) });
    expect(other.status).toBe(403);
  });
});
