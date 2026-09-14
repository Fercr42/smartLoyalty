import { NextRequest } from "next/server";
import { randomInt } from "crypto";
import { adminAuth, adminDb } from "../../../firebase/admin";
import { LinkConflict, linkMember } from "../../../lib/member-link";

export const runtime = "nodejs";

// Código de 8 caracteres para ligar otra app u otro navegador (ej. el ícono de iPhone, donde el enlace
// del correo no se puede abrir). "create" lo pide quien ya entró con su correo; "redeem" lo usa el otro navegador.

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE = /^[A-HJ-NP-Z2-9]{8}$/;
const TTL_MS = 10 * 60_000;
const COMPANY_ID = /^[A-Za-z0-9]{10,64}$/;
const MEMBER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const bad = (error: string, status = 400) => Response.json({ error }, { status });

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const codes = adminDb().collection("pairingCodes");

  if (body.action === "create") {
    const idToken = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!idToken) return bad("No autorizado", 401);
    let decoded;
    try {
      decoded = await adminAuth().verifyIdToken(idToken);
    } catch {
      return bad("Sesión inválida", 401);
    }
    if (!decoded.email || !decoded.email_verified) return bad("Verifica tu correo primero", 401);

    for (let attempt = 0; attempt < 5; attempt++) {
      const code = Array.from({ length: 8 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
      try {
        await codes.doc(code).create({ uid: decoded.uid, email: decoded.email, expiresAt: Date.now() + TTL_MS });
        return Response.json({ code, expiresInMinutes: TTL_MS / 60_000 });
      } catch {
        // ya existía ese código: probar otro
      }
    }
    return bad("No se pudo crear el código. Inténtalo de nuevo.", 500);
  }

  if (body.action === "redeem") {
    const code = String(body.code ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!CODE.test(code)) return bad("El código tiene 8 letras y números");
    if (!COMPANY_ID.test(body.companyId ?? "") || !MEMBER_ID.test(body.memberId ?? "")) return bad("Datos inválidos");

    const ref = codes.doc(code);
    const snap = await ref.get();
    const data = snap.data();
    if (!data || data.expiresAt < Date.now()) return bad("Código inválido o vencido. Pide uno nuevo.");
    await ref.delete(); // un solo uso
    if (!(await adminDb().collection("companies").doc(body.companyId).get()).exists) return bad("Restaurante no encontrado", 404);

    try {
      const result = await linkMember(body.companyId, body.memberId, { uid: data.uid, email: data.email }, Boolean(body.shareEmail));
      return Response.json(result);
    } catch (e) {
      if (e instanceof LinkConflict) return bad(e.message, 409);
      throw e;
    }
  }

  return bad("Acción inválida");
}
