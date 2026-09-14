import { NextRequest } from "next/server";
import { adminAuth, adminDb } from "../../../firebase/admin";
import { hashPin } from "../../../lib/staff-auth";

export const runtime = "nodejs";

// El dueño define el PIN que usan sus empleados para abrir el escáner.
export async function POST(req: NextRequest) {
  const idToken = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!idToken) return Response.json({ error: "No autorizado" }, { status: 401 });
  let uid: string;
  try {
    uid = (await adminAuth().verifyIdToken(idToken)).uid;
  } catch {
    return Response.json({ error: "Sesión inválida" }, { status: 401 });
  }

  const { pin } = await req.json().catch(() => ({}));
  if (!/^\d{4,8}$/.test(pin ?? "")) {
    return Response.json({ error: "El PIN debe tener de 4 a 8 números" }, { status: 400 });
  }

  const companyRef = adminDb().collection("companies").doc(uid);
  if (!(await companyRef.get()).exists) {
    return Response.json({ error: "Primero guarda los datos del restaurante" }, { status: 400 });
  }

  // Cambiar el PIN cierra las sesiones abiertas de empleados (pinVersion distinta).
  await companyRef
    .collection("private")
    .doc("staff")
    .set({ ...hashPin(pin), pinVersion: Date.now(), failed: 0, lockedUntil: 0 });
  await companyRef.set({ loyalty: { pinSet: true } }, { merge: true });

  return Response.json({ ok: true });
}
