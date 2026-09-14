import { NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "../../firebase/admin";
import { publicOrigin } from "../../lib/origin";

export const runtime = "nodejs";

// Enlace de "déjanos una reseña": cuenta el clic y lleva a la página de reseñas de Google del restaurante.
export async function GET(req: NextRequest, { params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const origin = publicOrigin(req.nextUrl.origin);
  if (!/^[A-Za-z0-9]{10,64}$/.test(companyId)) return Response.redirect(origin, 302);

  const companyRef = adminDb().collection("companies").doc(companyId);
  const url = (await companyRef.get()).data()?.reviews?.url;
  if (typeof url !== "string" || !/^https:\/\/\S+$/.test(url)) {
    return Response.redirect(`${origin}/join/${companyId}`, 302);
  }

  await companyRef.update({ "reviews.clicks": FieldValue.increment(1) }).catch(() => {});
  return Response.redirect(url, 302);
}
