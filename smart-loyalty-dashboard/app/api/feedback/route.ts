import { NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "../../firebase/admin";

export const runtime = "nodejs";

const COMPANY_ID = /^[A-Za-z0-9]{10,64}$/;
const MEMBER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Encuesta después de la visita: guarda la calificación (1 a 5) y el comentario.
// Solo con 4 o 5 estrellas se invita a dejar la reseña en Google; las opiniones bajas quedan para el dueño.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const rating = Math.round(Number(body.rating));
  const comment = typeof body.comment === "string" ? body.comment.trim().slice(0, 500) : "";
  if (!COMPANY_ID.test(body.companyId ?? "")) return Response.json({ error: "Restaurante inválido" }, { status: 400 });
  if (!(rating >= 1 && rating <= 5)) return Response.json({ error: "Elige de 1 a 5 estrellas" }, { status: 400 });

  const companyRef = adminDb().collection("companies").doc(body.companyId);
  const company = await companyRef.get();
  if (!company.exists) return Response.json({ error: "Restaurante no encontrado" }, { status: 404 });

  const memberId = MEMBER_ID.test(body.memberId ?? "") ? String(body.memberId) : "";
  const day = new Date().toISOString().slice(0, 10);
  // Con cliente conocido: una opinión por día (evita repeticiones). Sin cliente: se guarda igual.
  const ref = memberId ? companyRef.collection("feedback").doc(`${memberId}_${day}`) : companyRef.collection("feedback").doc();
  try {
    await ref.create({
      rating,
      comment,
      memberId: memberId || null,
      code: memberId ? memberId.slice(0, 8).toUpperCase() : null,
      at: FieldValue.serverTimestamp(),
    });
  } catch (e) {
    if ((e as { code?: number }).code === 6) {
      return Response.json({ error: "Ya nos dejaste tu opinión hoy. ¡Gracias!" }, { status: 409 });
    }
    throw e;
  }
  await companyRef.update({
    "feedbackStats.count": FieldValue.increment(1),
    "feedbackStats.sum": FieldValue.increment(rating),
  });

  const url = company.data()?.reviews?.url;
  const askReview = rating >= 4 && typeof url === "string" && /^https:\/\/\S+$/.test(url);
  return Response.json({ ok: true, askReview });
}
