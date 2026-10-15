import { NextRequest } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "../../../firebase/admin";
import { requireAdmin } from "../../../lib/admin-auth";
import { PLAN_PRICE_USD, planState } from "../../../lib/plan";

export const runtime = "nodejs";
export const maxDuration = 60;

const DAY = 86_400_000;

// Todos los restaurantes con su plan y uso de los últimos 30 días.
export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof Response) return admin;

  const db = adminDb();
  const since = Timestamp.fromMillis(Date.now() - 30 * DAY);
  const companies = await db.collection("companies").get();

  const rows = await Promise.all(
    companies.docs
      .filter((d) => !d.id.startsWith("zz")) // restaurantes de prueba automáticos
      .map(async (d) => {
        const data = d.data();
        const [members, devices, activity, sends] = await Promise.all([
          d.ref.collection("walletMembers").count().get(),
          d.ref.collection("subscribers").count().get(),
          d.ref.collection("loyaltyEvents").where("at", ">=", since).count().get(),
          d.ref.collection("notifications").where("createdAt", ">=", since).count().get(),
        ]);
        const state = planState(data.plan);
        return {
          id: d.id,
          name: data.name ?? "(sin nombre)",
          ownerName: data.ownerName ?? "",
          ownerEmail: data.owner ?? "",
          phone: data.phone ?? "",
          city: data.city ?? "",
          createdAt: data.createdAt?.toMillis?.() ?? null,
          plan: {
            ...state,
            provider: data.plan?.provider ?? null,
            trialEndsAt: data.plan?.trialEndsAt ?? null,
          },
          usage: {
            members: members.data().count,
            devices: devices.data().count,
            activity30: activity.data().count,
            sends30: sends.data().count,
          },
        };
      })
  );

  rows.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  const now = Date.now();
  const paying = rows.filter((r) => r.plan.allowed && r.plan.provider === "paypal" && !r.plan.canceled);
  const summary = {
    total: rows.length,
    trial: rows.filter((r) => r.plan.status === "trial").length,
    trialEndingSoon: rows.filter((r) => r.plan.status === "trial" && (r.plan.trialEndsAt ?? 0) - now <= 3 * DAY).length,
    paying: paying.length,
    manual: rows.filter((r) => r.plan.status === "active" && r.plan.provider !== "paypal").length,
    expired: rows.filter((r) => r.plan.status === "expired").length,
    none: rows.filter((r) => r.plan.status === "none").length,
    monthlyRevenueUsd: paying.length * PLAN_PRICE_USD,
  };

  return Response.json({ summary, restaurants: rows, generatedAt: now });
}
