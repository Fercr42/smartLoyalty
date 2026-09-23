import { afterAll, describe, expect, it } from "vitest";
import { auth, cleanup, hasCredentials, uniqueId } from "./helpers";

const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const identity = (path: string, body: object) =>
  fetch(`https://identitytoolkit.googleapis.com/v1/accounts:${path}?key=${API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then(async (r) => ({ status: r.status, data: await r.json() }));

describe.skipIf(!hasCredentials)("Registro con correo y contraseña", () => {
  const email = `${uniqueId("correo").toLowerCase()}@example.com`;
  const password = "clave-larga-123";

  afterAll(async () => {
    const user = await auth().getUserByEmail(email).catch(() => null);
    if (user) await auth().deleteUser(user.uid);
    await cleanup();
  });

  it("crea la cuenta y deja entrar con la contraseña", async () => {
    const created = await identity("signUp", { email, password, returnSecureToken: true });
    expect(created.status).toBe(200);
    const login = await identity("signInWithPassword", { email, password, returnSecureToken: true });
    expect(login.status).toBe(200);
    expect(login.data.email).toBe(email);
  });

  it("rechaza la contraseña equivocada", async () => {
    const bad = await identity("signInWithPassword", { email, password: "otra-clave-999", returnSecureToken: true });
    expect(bad.status).toBe(400);
  });
});
