import { NextRequest } from "next/server";
import { adminAuth } from "../../../firebase/admin";
import { saveOwnerDevice } from "../../../lib/owner-push";

export const runtime = "nodejs";

// La app del dueño registra su celular para recibir avisos (opiniones de clientes, etc.).
export async function POST(req: NextRequest) {
  const idToken = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!idToken) return Response.json({ error: "No autorizado" }, { status: 401 });
  let uid: string;
  try {
    uid = (await adminAuth().verifyIdToken(idToken)).uid;
  } catch {
    return Response.json({ error: "Sesión inválida" }, { status: 401 });
  }
  const { token, platform } = await req.json().catch(() => ({}));
  if (typeof token !== "string" || !/^[\w:-]{20,4096}$/.test(token)) return Response.json({ error: "Datos inválidos" }, { status: 400 });
  await saveOwnerDevice(uid, token, platform === "ios" ? "ios" : "android");
  return Response.json({ ok: true });
}
