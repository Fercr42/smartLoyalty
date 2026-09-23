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
    tickets: snap.docs.map((d) => {
      const t = d.data();
      const ms = (v: unknown) =>
        typeof v === "object" && v && "toMillis" in v ? (v as { toMillis: () => number }).toMillis() : null;
      return {
        id: d.id,
        name: t.name ?? "",
        email: t.email ?? "",
        business: t.business ?? "",
        subject: t.subject ?? "",
        message: t.message ?? "",
        locale: t.locale ?? "",
        origen: t.origen ?? "formulario",
        status: t.status ?? "nuevo",
        replies: (Array.isArray(t.replies) ? t.replies : []).map((r) => ({
          message: r?.message ?? "",
          by: r?.by ?? "",
          at: ms(r?.at) ?? (r?.at instanceof Date ? r.at.getTime() : null),
        })),
        at: ms(t.at),
      };
    }),
  });
}
