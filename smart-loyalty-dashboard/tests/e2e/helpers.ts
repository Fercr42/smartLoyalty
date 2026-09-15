import crypto from "node:crypto";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// Utilidades para probar el sitio publicado con datos desechables.

export const BASE_URL = (process.env.E2E_BASE_URL || "https://smart-loyalty-fawn.vercel.app").replace(/\/+$/, "");
export const hasCredentials = Boolean(process.env.FIREBASE_SERVICE_ACCOUNT && process.env.NEXT_PUBLIC_FIREBASE_API_KEY);

function app() {
  return (
    getApps().find((a) => a.name === "e2e") ??
    initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT!)) }, "e2e")
  );
}
export const db = () => getFirestore(app());
export const auth = () => getAuth(app());

const created = { companies: new Set<string>(), users: new Set<string>() };

export const uniqueId = (label: string) => `zzE2E${label}${Date.now()}${crypto.randomInt(1000, 9999)}`;

export async function createCompany(data: Record<string, unknown> = {}, pin = "4321") {
  const id = uniqueId("Co");
  const ref = db().collection("companies").doc(id);
  await ref.set({ name: `Prueba ${id.slice(-6)}`, plan: { status: "active" }, ...data });
  const salt = crypto.randomBytes(16).toString("hex");
  await ref.collection("private").doc("staff").set({
    salt,
    pinHash: crypto.scryptSync(pin, salt, 32).toString("hex"),
    pinVersion: 1,
    failed: 0,
    lockedUntil: 0,
  });
  created.companies.add(id);
  return id;
}

export async function addMember(companyId: string, data: Record<string, unknown> = {}, withDevice = false) {
  const memberId = crypto.randomUUID();
  const ref = db().collection("companies").doc(companyId);
  await ref.collection("walletMembers").doc(memberId).set({ platform: "web", stamps: 0, totalVisits: 0, ...data });
  if (withDevice) {
    await ref
      .collection("subscribers")
      .doc(`fake-${memberId}`)
      .set({ token: `fake-${memberId}`, channel: "webpush", memberId, platform: "web" });
  }
  return memberId;
}

// Sesión de Firebase para un usuario de prueba (con correo verificado si se pide).
export async function idTokenFor(uid: string, email?: string) {
  if (email) await auth().createUser({ uid, email, emailVerified: true });
  created.users.add(uid);
  const token = await auth().createCustomToken(uid);
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${process.env.NEXT_PUBLIC_FIREBASE_API_KEY}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, returnSecureToken: true }) }
  );
  const data = await res.json();
  if (!data.idToken) throw new Error(`No se pudo iniciar sesión de prueba: ${JSON.stringify(data)}`);
  return data.idToken as string;
}

export const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

export async function api(
  path: string,
  { method = "POST", body, headers = {} }: { method?: string; body?: unknown; headers?: Record<string, string> } = {}
) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data: Record<string, any> = {}; // eslint-disable-line @typescript-eslint/no-explicit-any
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  return { status: res.status, data, headers: res.headers };
}

export async function staffHeaders(companyId: string, pin = "4321") {
  const r = await api("/api/loyalty/staff", { body: { action: "login", companyId, pin } });
  if (!r.data.token) throw new Error(`Login de empleado falló: ${r.status} ${JSON.stringify(r.data)}`);
  return { "X-Staff-Token": r.data.token as string };
}

export async function cleanup() {
  for (const id of created.companies) {
    const jobs = await db().collection("scheduledJobs").where("companyId", "==", id).get();
    await Promise.all(jobs.docs.map((d) => d.ref.delete()));
    await db().recursiveDelete(db().collection("companies").doc(id));
  }
  for (const uid of created.users) {
    const codes = await db().collection("pairingCodes").where("uid", "==", uid).get();
    await Promise.all(codes.docs.map((d) => d.ref.delete()));
    await db().collection("customers").doc(uid).delete().catch(() => {});
    await auth().deleteUser(uid).catch(() => {});
  }
  created.companies.clear();
  created.users.clear();
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
