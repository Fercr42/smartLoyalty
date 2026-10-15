import { NextRequest } from "next/server";
import { adminDb } from "../../../firebase/admin";
import { requireAdmin } from "../../../lib/admin-auth";
import { planState } from "../../../lib/plan";

export const runtime = "nodejs";

const DAY = 86_400_000;

// Cambios de plan hechos a mano por el administrador (ej. un restaurante que pagó por transferencia).
export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof Response) return admin;

  const { companyId, action } = await req.json().catch(() => ({}));
  if (typeof companyId !== "string" || !/^[A-Za-z0-9]{10,64}$/.test(companyId)) {
    return Response.json({ error: "Restaurante inválido" }, { status: 400 });
  }
  const ref = adminDb().collection("companies").doc(companyId);
  const snap = await ref.get();
  if (!snap.exists) return Response.json({ error: "Restaurante no encontrado" }, { status: 404 });

  const current = snap.data()?.plan ?? {};
  const now = Date.now();
  const audit = { updatedAt: now, updatedBy: admin.email };
  let plan: Record<string, unknown>;

  switch (action) {
    case "activate_30":
      plan = {
        status: "active",
        provider: "manual",
        paidUntil: Math.max(now, current.provider === "manual" && current.paidUntil ? current.paidUntil : now) + 30 * DAY,
        ...audit,
      };
      break;
    case "activate_forever":
      plan = { status: "active", provider: "manual", ...audit };
      break;
    case "extend_trial":
      plan = {
        status: "trial",
        startedAt: current.startedAt ?? now,
        trialEndsAt: Math.max(now, current.status === "trial" ? current.trialEndsAt ?? now : now) + 7 * DAY,
        ...audit,
      };
      break;
    case "expire":
      plan = { status: "expired", provider: current.provider ?? "manual", ...audit };
      break;
    default:
      return Response.json({ error: "Acción inválida" }, { status: 400 });
  }

  await ref.update({ plan });
  return Response.json({ plan: planState(plan) });
}
