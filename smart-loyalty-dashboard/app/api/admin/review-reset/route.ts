import { NextRequest } from "next/server";
import { FieldPath, FieldValue } from "firebase-admin/firestore";
import { adminDb } from "../../../firebase/admin";
import { requireAdmin } from "../../../lib/admin-auth";

export const runtime = "nodejs";

// Administrador: reinicia la encuesta de reseña de un cliente (por su código de 8 caracteres),
// para que se le vuelva a pedir en su próxima compra. Útil para probar.
export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof Response) return admin;

  const { companyId, code } = await req.json().catch(() => ({}));
  if (typeof companyId !== "string" || !/^[A-Za-z0-9]{10,64}$/.test(companyId)) {
    return Response.json({ error: "Restaurante inválido" }, { status: 400 });
  }
  const short = String(code ?? "").trim().toLowerCase().replace(/[^0-9a-f]/g, "");
  if (short.length !== 8) return Response.json({ error: "Código no válido. Son 8 caracteres, ej. 3F9A12BC." }, { status: 400 });

  const members = adminDb().collection("companies").doc(companyId).collection("walletMembers");
  const matches = await members.orderBy(FieldPath.documentId()).startAt(short).endAt(`${short}`).limit(2).get();
  if (matches.empty) return Response.json({ error: "Tarjeta no encontrada en este restaurante" }, { status: 404 });
  if (matches.size > 1) return Response.json({ error: "Hay más de una tarjeta con ese código." }, { status: 409 });

  await matches.docs[0].ref.update({
    reviewRequestedAt: FieldValue.delete(),
    reviewRequests: FieldValue.delete(),
    reviewAnsweredAt: FieldValue.delete(),
  });
  return Response.json({ ok: true, code: short.toUpperCase() });
}
