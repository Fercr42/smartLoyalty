import { NextRequest } from "next/server";
import { adminDb } from "../../../firebase/admin";
import { requireAdmin } from "../../../lib/admin-auth";

export const runtime = "nodejs";

const COMPANY_ID = /^[A-Za-z0-9]{10,64}$/;

// Opiniones de la encuesta de un restaurante, para la vista de datos del administrador.
export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof Response) return admin;
  const companyId = req.nextUrl.searchParams.get("companyId") ?? "";
  if (!COMPANY_ID.test(companyId)) return Response.json({ error: "Restaurante inválido" }, { status: 400 });

  const companyRef = adminDb().collection("companies").doc(companyId);
  const [company, snap] = await Promise.all([
    companyRef.get(),
    companyRef.collection("feedback").orderBy("at", "desc").limit(20).get(),
  ]);
  if (!company.exists) return Response.json({ error: "Restaurante no encontrado" }, { status: 404 });

  const stats = company.data()?.feedbackStats ?? {};
  return Response.json({
    average: stats.count ? stats.sum / stats.count : null,
    count: stats.count ?? 0,
    feedback: snap.docs.map((d) => ({
      id: d.id,
      rating: d.data().rating ?? 0,
      comment: d.data().comment ?? "",
      code: d.data().code ?? null,
      at: d.data().at?.toMillis?.() ?? null,
    })),
  });
}
