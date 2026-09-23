import { afterAll, describe, expect, it } from "vitest";
import { api, bearer, db, hasCredentials, idTokenFor } from "./helpers";

const email = `zze2e-soporte-${Date.now()}@example.com`;

describe.skipIf(!hasCredentials)("Página de soporte", () => {
  afterAll(async () => {
    const mine = await db().collection("supportTickets").where("email", "==", email).get();
    await Promise.all(mine.docs.map((d) => d.ref.delete()));
  });

  it("rechaza correo inválido y mensaje vacío", async () => {
    expect((await api("/api/support", { body: { email: "no-es-correo", message: "hola que tal" } })).status).toBe(400);
    expect((await api("/api/support", { body: { email, message: " " } })).status).toBe(400);
  });

  it("guarda el mensaje", async () => {
    const r = await api("/api/support", { body: { email, name: "Fer", business: "Rancho", message: "No me entra el escáner", locale: "es" } });
    expect(r.status).toBe(200);
    const saved = await db().collection("supportTickets").where("email", "==", email).get();
    expect(saved.docs.map((d) => d.data().message)).toEqual(["No me entra el escáner"]);
  });

  it("solo el administrador lee la bandeja", async () => {
    expect((await api("/api/admin/support", { method: "GET" })).status).toBe(401);
    const other = await api("/api/admin/support", { method: "GET", headers: bearer(await idTokenFor(`zzE2Esoporte${Date.now()}`)) });
    expect(other.status).toBe(403);
  });

  it("la página responde en los tres idiomas", async () => {
    for (const [lang, text] of [["es", "Preguntas frecuentes"], ["en", "Frequently asked"], ["th", "คำถามที่พบบ่อย"]] as const) {
      const html = await fetch(`${process.env.E2E_BASE_URL || "https://smartloyalty.app"}/soporte`, {
        headers: { "Accept-Language": lang },
      }).then((r) => r.text());
      expect(html).toContain(text);
    }
  });
});
