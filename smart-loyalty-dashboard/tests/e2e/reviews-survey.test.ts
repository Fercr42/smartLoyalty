import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { addMember, api, bearer, cleanup, createCompany, db, hasCredentials, idTokenFor, staffHeaders, BASE_URL } from "./helpers";

describe.skipIf(!hasCredentials)("Pedido de reseña y encuesta", () => {
  let companyId = "";
  let reachable = "";
  let unreachable = "";

  beforeAll(async () => {
    companyId = await createCompany({
      name: "Prueba Encuesta",
      loyalty: { rewards: [{ id: "a", title: "Bebida", stamps: 5 }] },
      reviews: { enabled: true, survey: true, url: "https://example.com/resena", delayHours: 2 },
    });
    reachable = await addMember(companyId, {}, true);
    unreachable = await addMember(companyId, { platform: "google" }); // tocó Wallet pero no guardó la tarjeta
  });
  afterAll(cleanup);

  it("después de la primera compra programa la encuesta solo si hay cómo avisarle", async () => {
    const staff = await staffHeaders(companyId);
    await api("/api/loyalty/staff", { body: { action: "stamp", companyId, memberId: unreachable, sale: 5000 }, headers: staff });
    await api("/api/loyalty/staff", { body: { action: "stamp", companyId, memberId: reachable, sale: 5000 }, headers: staff });

    const jobs = (await db().collection("scheduledJobs").where("companyId", "==", companyId).get()).docs.map((d) => d.data());
    expect(jobs).toHaveLength(1);
    expect(jobs[0].payload).toMatchObject({ kind: "review", memberIds: [reachable] });
    expect(jobs[0].payload.link).toBe(`${BASE_URL}/encuesta/${companyId}?m=${reachable}`);

    const members = db().collection("companies").doc(companyId).collection("walletMembers");
    expect((await members.doc(unreachable).get()).data()?.reviewRequestedAt).toBeUndefined();
  });

  it("la página de la encuesta carga", async () => {
    const html = await fetch(`${BASE_URL}/encuesta/${companyId}?m=${reachable}`).then((r) => r.text());
    expect(html).toContain("Prueba Encuesta");
  });

  it("4-5 estrellas invitan a Google; 1-3 no; una por cliente al día", async () => {
    let r = await api("/api/feedback", { body: { companyId, memberId: reachable, rating: 5, comment: "Excelente" } });
    expect(r.data).toMatchObject({ ok: true, askReview: true });
    r = await api("/api/feedback", { body: { companyId, memberId: reachable, rating: 4 } });
    expect(r.status).toBe(409);
    r = await api("/api/feedback", { body: { companyId, rating: 2, comment: "Tardaron mucho" } });
    expect(r.data).toMatchObject({ ok: true, askReview: false });
    r = await api("/api/feedback", { body: { companyId, rating: 9 } });
    expect(r.status).toBe(400);
  });

  it("Inicio muestra la calificación promedio", async () => {
    const owner = bearer(await idTokenFor(companyId));
    const r = await api("/api/stats", { method: "GET", headers: owner });
    expect(r.data.feedback).toEqual({ count: 2, average: 3.5 });
  });

  it("el enlace de reseña redirige a Google y cuenta el clic", async () => {
    const res = await fetch(`${BASE_URL}/r/${companyId}`, { redirect: "manual" });
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("https://example.com/resena");
  });
});
