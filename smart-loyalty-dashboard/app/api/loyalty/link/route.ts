import { NextRequest } from "next/server";
import { adminAuth, adminDb } from "../../../firebase/admin";
import { LinkConflict, linkMember } from "../../../lib/member-link";

export const runtime = "nodejs";

const COMPANY_ID = /^[A-Za-z0-9]{10,64}$/;
const MEMBER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// El cliente entró con el enlace de su correo: ligar (o recuperar) su tarjeta de este restaurante.
export async function POST(req: NextRequest) {
  const idToken = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!idToken) return Response.json({ error: "Abre el enlace de tu correo para proteger tu tarjeta" }, { status: 401 });
  let uid: string;
  let email: string | undefined;
  try {
    const decoded = await adminAuth().verifyIdToken(idToken);
    if (!decoded.email || !decoded.email_verified) throw new Error("correo sin verificar");
    uid = decoded.uid;
    email = decoded.email;
  } catch {
    return Response.json({ error: "No se pudo verificar tu correo. Vuelve a pedir el enlace." }, { status: 401 });
  }

  const { companyId, memberId, shareEmail } = await req.json().catch(() => ({}));
  if (!COMPANY_ID.test(companyId ?? "") || !MEMBER_ID.test(memberId ?? "")) {
    return Response.json({ error: "Datos inválidos" }, { status: 400 });
  }
  if (!(await adminDb().collection("companies").doc(companyId).get()).exists) {
    return Response.json({ error: "Restaurante no encontrado" }, { status: 404 });
  }

  try {
    const result = await linkMember(companyId, memberId, { uid, email }, Boolean(shareEmail));
    return Response.json({ ...result, email: shareEmail ? email : null });
  } catch (e) {
    if (e instanceof LinkConflict) return Response.json({ error: e.message }, { status: 409 });
    throw e;
  }
}
