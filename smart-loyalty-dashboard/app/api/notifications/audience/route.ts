import { NextRequest } from "next/server";
import { adminAuth, adminDb } from "../../../firebase/admin";
import { audienceCounts } from "../../../lib/send-notification";

export const runtime = "nodejs";

// Cuántos celulares y clientes hay en cada grupo, para elegir a quién enviar.
export async function GET(req: NextRequest) {
  const idToken = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!idToken) return Response.json({ error: "No autorizado" }, { status: 401 });
  let uid: string;
  try {
    uid = (await adminAuth().verifyIdToken(idToken)).uid;
  } catch {
    return Response.json({ error: "Sesión inválida" }, { status: 401 });
  }
  return Response.json(await audienceCounts(adminDb().collection("companies").doc(uid)));
}
