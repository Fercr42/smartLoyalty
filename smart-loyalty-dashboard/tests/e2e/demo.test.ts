import { afterAll, describe, expect, it } from "vitest";
import { api, bearer, db, hasCredentials, idTokenFor } from "./helpers";

const email = `zze2e-demo-${Date.now()}@example.com`;

describe.skipIf(!hasCredentials)("Solicitudes de demo", () => {
  afterAll(async () => {
    const mine = await db().collection("demoRequests").where("email", "==", email).get();
    await Promise.all(mine.docs.map((d) => d.ref.delete()));
  });

  it("pide nombre y una forma de contacto", async () => {
    expect((await api("/api/demo", { body: { name: "", email } })).status).toBe(400);
    expect((await api("/api/demo", { body: { name: "Fer", phone: "", email: "" } })).status).toBe(400);
  });

  it("guarda la solicitud", async () => {
    const r = await api("/api/demo", {
      body: { name: "Fer", business: "Soda Zz", phone: "+50688887777", email, kind: "cafe", when: "mañana", locale: "es" },
    });
    expect(r.status).toBe(200);
    const saved = await db().collection("demoRequests").where("email", "==", email).get();
    expect(saved.docs.map((d) => d.data().business)).toEqual(["Soda Zz"]);
  });

  it("solo el administrador ve las solicitudes", async () => {
    expect((await api("/api/admin/demos", { method: "GET" })).status).toBe(401);
    const otro = await api("/api/admin/demos", { method: "GET", headers: bearer(await idTokenFor(`zzE2Edemo${Date.now()}`)) });
    expect(otro.status).toBe(403);
  });

  it("la página responde en los tres idiomas", async () => {
    const base = process.env.E2E_BASE_URL || "https://smartloyalty.app";
    for (const [lang, text] of [["es", "Veámoslo con tu negocio"], ["en", "Let's walk through it"], ["th", "มาดูไปพร้อมกัน"]] as const) {
      const html = await fetch(`${base}/demo`, { headers: { "Accept-Language": lang } }).then((r) => r.text());
      expect(html).toContain(text);
    }
  });
});
