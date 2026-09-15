import { Timestamp } from "firebase-admin/firestore";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { addMember, api, bearer, cleanup, createCompany, db, hasCredentials, idTokenFor, sleep, staffHeaders } from "./helpers";

describe.skipIf(!hasCredentials)("Notificaciones, grupos, programadas y resultados", () => {
  let companyId = "";
  let owner: Record<string, string> = {};
  let frequent = "";

  beforeAll(async () => {
    companyId = await createCompany({ loyalty: { rewards: [{ id: "a", title: "Bebida", stamps: 3 }] } });
    frequent = await addMember(companyId, { stamps: 2, totalVisits: 6, lastStampAt: Timestamp.now() }, true);
    // Cliente inactivo: vino una vez hace 40 días.
    await addMember(companyId, { stamps: 0, totalVisits: 1, lastStampAt: Timestamp.fromMillis(Date.now() - 40 * 86_400_000) });
    owner = bearer(await idTokenFor(companyId));
  });
  afterAll(cleanup);

  it("cuenta clientes y celulares por grupo", async () => {
    const r = await api("/api/notifications/audience", { method: "GET", headers: owner });
    expect(r.status).toBe(200);
    expect(r.data.all).toEqual({ devices: 1, members: 2 });
    expect(r.data.frequent).toEqual({ devices: 1, members: 1 });
    expect(r.data.inactive.members).toBe(1);
    expect(r.data.near_reward.members).toBe(1);
  });

  it("envía a un grupo con cupón y guarda a quién le llegó", async () => {
    const expires = new Date(Date.now() + 3 * 86_400_000);
    const r = await api("/api/notifications", {
      headers: owner,
      body: {
        type: "promo",
        title: "Prueba grupo",
        body: "Solo frecuentes",
        audience: "frequent",
        coupon: { title: "20% prueba", expiresAt: expires.getTime(), expiresDate: expires.toISOString().slice(0, 10) },
      },
    });
    expect(r.status).toBe(200);
    expect(r.data.sent + r.data.failed).toBe(1);
    const notification = (await db().collection("companies").doc(companyId).collection("notifications").get()).docs[0].data();
    expect(notification.recipients).toEqual([frequent]);
    expect(notification.couponId).toBeTruthy();

    const page = await fetch(`${r.data.promoUrl}?src=push`).then((x) => x.text());
    expect(page).toContain("20% prueba");
  });

  it("los resultados muestran quién volvió y el cupón usado", async () => {
    const staff = await staffHeaders(companyId);
    await api("/api/loyalty/staff", { body: { action: "stamp", companyId, memberId: frequent, force: true }, headers: staff });
    const couponId = (await db().collection("companies").doc(companyId).collection("coupons").get()).docs[0].id;
    await api("/api/loyalty/staff", { body: { action: "coupon", companyId, memberId: frequent, couponId }, headers: staff });

    const r = await api("/api/campaigns", { method: "GET", headers: owner });
    expect(r.status).toBe(200);
    expect(r.data.campaigns[0]).toMatchObject({ recipientCount: 1, returned: 1, visits: 1, views: 1, pushViews: 1, inProgress: true });
    expect(r.data.campaigns[0].coupon).toMatchObject({ redemptions: 1 });
  });

  it("programa envíos: los de una vez se borran y los diarios pasan a mañana", async () => {
    const once = await api("/api/notifications", { headers: owner, body: { type: "aviso", title: "Una vez", body: "x", sendAt: Date.now() + 2000, repeat: "none" } });
    const daily = await api("/api/notifications", { headers: owner, body: { type: "aviso", title: "Diaria", body: "x", audience: "inactive", sendAt: Date.now() + 2000, repeat: "daily" } });
    expect(once.data.scheduled && daily.data.scheduled).toBe(true);
    await sleep(4000);
    await api("/api/cron/scheduled");

    const jobs = db().collection("scheduledJobs");
    for (let i = 0; i < 10 && (await jobs.doc(once.data.id).get()).exists; i++) await sleep(3000);
    expect((await jobs.doc(once.data.id).get()).exists).toBe(false);
    const dailyJob = await jobs.doc(daily.data.id).get();
    const hoursAhead = (dailyJob.data()!.sendAt.toMillis() - Date.now()) / 3_600_000;
    expect(hoursAhead).toBeGreaterThan(23);
    expect(hoursAhead).toBeLessThan(25);
  });

  it("no deja enviar sin sesión", async () => {
    const r = await api("/api/notifications", { body: { type: "promo", title: "x", body: "y" } });
    expect(r.status).toBe(401);
  });
});
