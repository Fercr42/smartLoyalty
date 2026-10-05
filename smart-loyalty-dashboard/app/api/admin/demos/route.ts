import { NextRequest } from "next/server";
import { adminDb } from "../../../firebase/admin";
import { requireAdmin } from "../../../lib/admin-auth";

export const runtime = "nodejs";

// Solicitudes de demo que llegan desde /demo (solo administrador de la plataforma).
export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof Response) return admin;

  const snap = await adminDb().collection("demoRequests").orderBy("at", "desc").limit(50).get();
  return Response.json({
    demos: snap.docs.map((d) => {
      const r = d.data();
      return {
        id: d.id,
        name: r.name ?? "",
        business: r.business ?? "",
        phone: r.phone ?? "",
        email: r.email ?? "",
        kind: r.kind ?? "",
        when: r.when ?? "",
        message: r.message ?? "",
        locale: r.locale ?? "",
        status: r.status ?? "nuevo",
        at: r.at?.toMillis?.() ?? null,
      };
    }),
  });
}
