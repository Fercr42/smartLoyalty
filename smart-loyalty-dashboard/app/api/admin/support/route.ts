import { NextRequest } from "next/server";
import { adminDb } from "../../../firebase/admin";
import { requireAdmin } from "../../../lib/admin-auth";

export const runtime = "nodejs";

// Mensajes que llegan desde la página de soporte (solo administrador de la plataforma).
export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof Response) return admin;

  const snap = await adminDb().collection("supportTickets").orderBy("at", "desc").limit(50).get();
  return Response.json({
    tickets: snap.docs.map((d) => ({
      id: d.id,
      name: d.data().name ?? "",
      email: d.data().email ?? "",
      business: d.data().business ?? "",
      message: d.data().message ?? "",
      locale: d.data().locale ?? "",
      at: d.data().at?.toMillis?.() ?? null,
    })),
  });
}
