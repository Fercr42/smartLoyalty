import { afterAll, describe, expect, it } from "vitest";
import { api, bearer, BASE_URL, cleanup, createCompany, db, hasCredentials, idTokenFor, uniqueId } from "./helpers";

describe.skipIf(!hasCredentials)("Registro, planes, administrador, pagos y páginas", () => {
  afterAll(cleanup);

  it("las páginas principales cargan", async () => {
    for (const path of ["/", "/registro", "/panel", "/admin"]) {
      const res = await fetch(`${BASE_URL}${path}`);
      expect(res.status, path).toBe(200);
    }
  });

  it("el registro da 14 días de prueba una sola vez", async () => {
    const uid = uniqueId("Signup");
    const token = await idTokenFor(uid, `${uid.toLowerCase()}@example.com`);
    let r = await api("/api/signup", {
      headers: bearer(token),
      body: { name: "Prueba Registro", ownerName: "Ana", phone: "+506 8888 8888", city: "San José", timezone: "America/Costa_Rica" },
    });
    expect(r.status).toBe(200);
    // El registro crea companies/{uid}: se limpia al final junto con el usuario.
    const company = (await db().collection("companies").doc(uid).get()).data()!;
    expect(company.plan.status).toBe("trial");
    expect(Math.round((company.plan.trialEndsAt - Date.now()) / 86_400_000)).toBe(14);
    r = await api("/api/signup", { headers: bearer(token), body: { name: "Otra vez", ownerName: "Ana", phone: "+506 8888 8888" } });
    expect(r.data.existing).toBe(true);

    // El dueño no puede cambiar su plan desde el navegador, pero sí su perfil.
    const project = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT!).project_id;
    const patch = (field: string, value: unknown) =>
      fetch(`https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents/companies/${uid}?updateMask.fieldPaths=${field}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ fields: { [field]: value } }),
      });
    expect((await patch("plan", { mapValue: { fields: { status: { stringValue: "active" } } } })).status).toBe(403);
    expect((await patch("description", { stringValue: "hola" })).status).toBe(200);

    // Con la prueba vencida no se puede enviar.
    // Vencida hace un día (con margen, por si el reloj local va adelantado respecto al servidor).
    await db().collection("companies").doc(uid).update({ "plan.trialEndsAt": Date.now() - 86_400_000 });
    r = await api("/api/notifications", { headers: bearer(token), body: { type: "promo", title: "x", body: "y" } });
    expect(r.status).toBe(402);
    await db().recursiveDelete(db().collection("companies").doc(uid));
  });

  it("el administrador solo deja entrar a los correos autorizados", async () => {
    expect((await api("/api/admin/overview", { method: "GET" })).status).toBe(401);
    const uid = uniqueId("NotAdmin");
    const token = await idTokenFor(uid, `${uid.toLowerCase()}@example.com`);
    expect((await api("/api/admin/overview", { method: "GET", headers: bearer(token) })).status).toBe(403);
    expect((await api("/api/admin/company", { headers: bearer(token), body: { companyId: "abcdefghij12", action: "expire" } })).status).toBe(403);
  });

  it("PayPal: rechaza avisos falsos y activar sin sesión", async () => {
    expect((await api("/api/billing/paypal/webhook", { body: { event_type: "BILLING.SUBSCRIPTION.ACTIVATED", resource: { id: "I-FAKE123456" } } })).status).toBe(401);
    expect((await api("/api/billing/paypal/activate", { body: { subscriptionId: "I-FAKE123456" } })).status).toBe(401);
  });

  it("un dueño no puede ver los datos de otro restaurante", async () => {
    const [mine, other] = await Promise.all([createCompany(), createCompany()]);
    const owner = bearer(await idTokenFor(mine));
    for (const path of ["/api/stats", "/api/campaigns"]) {
      expect((await api(`${path}?companyId=${other}`, { method: "GET", headers: owner })).status, path).toBe(403);
      expect((await api(`${path}?companyId=${mine}`, { method: "GET", headers: owner })).status, path).toBe(200);
    }
    expect((await api(`/api/admin/feedback?companyId=${other}`, { method: "GET", headers: owner })).status).toBe(403);
  });

  it("IA: no deja usarla sin sesión", async () => {
    expect((await api("/api/ai/campaign", { body: { goal: "Llenar los martes" } })).status).toBe(401);
    expect((await api("/api/ai/feedback", { body: {} })).status).toBe(401);
  });

  it("dibuja la tarjeta y la portada de Wallet como imagen", async () => {
    const companyId = await createCompany({ loyalty: { rewards: [{ id: "a", title: "Bebida", stamps: 5 }] } });
    for (const variant of ["card", "hero"]) {
      const res = await fetch(`${BASE_URL}/card-image/${companyId}?variant=${variant}&s=3&code=ABCD1234`);
      expect(res.status, variant).toBe(200);
      expect(res.headers.get("content-type")).toContain("image/png");
    }
  });
});
