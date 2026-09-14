import { NextRequest } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "../../firebase/admin";

export const runtime = "nodejs";

const DAY = 86_400_000;
const RETURN_WINDOW_DAYS = 7;

// Resultados de las últimas 20 campañas: alcance, aperturas, cupones usados
// y clientes que recibieron el mensaje y volvieron (con sello) en los 7 días siguientes.
export async function GET(req: NextRequest) {
  const idToken = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!idToken) return Response.json({ error: "No autorizado" }, { status: 401 });
  let uid: string;
  try {
    uid = (await adminAuth().verifyIdToken(idToken)).uid;
  } catch {
    return Response.json({ error: "Sesión inválida" }, { status: 401 });
  }

  const companyRef = adminDb().collection("companies").doc(uid);
  const notifications = await companyRef.collection("notifications").orderBy("createdAt", "desc").limit(20).get();
  if (notifications.empty) return Response.json({ campaigns: [], windowDays: RETURN_WINDOW_DAYS });

  const oldest = Math.min(...notifications.docs.map((d) => d.data().createdAt?.toMillis?.() ?? Date.now()));
  const [events, coupons] = await Promise.all([
    companyRef.collection("loyaltyEvents").where("at", ">=", Timestamp.fromMillis(oldest)).select("memberId", "type", "at").get(),
    (async () => {
      const ids = [...new Set(notifications.docs.map((d) => d.data().couponId).filter(Boolean))] as string[];
      if (!ids.length) return new Map<string, { title: string; redemptions: number }>();
      const snaps = await adminDb().getAll(...ids.map((id) => companyRef.collection("coupons").doc(id)));
      return new Map(snaps.map((s) => [s.id, { title: s.data()?.title ?? "", redemptions: s.data()?.redemptions ?? 0 }]));
    })(),
  ]);

  // Visitas (sellos) por cliente.
  const visitsByMember = new Map<string, number[]>();
  events.docs.forEach((e) => {
    if (e.data().type !== "stamp") return;
    const at = e.data().at?.toMillis?.();
    if (!at) return;
    const list = visitsByMember.get(e.data().memberId) ?? [];
    list.push(at);
    visitsByMember.set(e.data().memberId, list);
  });

  const now = Date.now();
  const campaigns = notifications.docs.map((d) => {
    const n = d.data();
    const sentAt = n.createdAt?.toMillis?.() ?? 0;
    const windowEnd = sentAt + RETURN_WINDOW_DAYS * DAY;
    const recipients: string[] | undefined = Array.isArray(n.recipients) ? n.recipients : undefined;
    let returned = 0;
    let visits = 0;
    recipients?.forEach((memberId) => {
      const inWindow = (visitsByMember.get(memberId) ?? []).filter((t) => t >= sentAt && t <= windowEnd).length;
      if (inWindow) returned++;
      visits += inWindow;
    });
    return {
      id: d.id,
      title: n.title ?? "",
      kind: n.kind ?? null,
      audience: n.audience ?? "all",
      sentAt,
      pushSent: n.sent ?? 0,
      wallet: n.wallet ?? "off",
      views: n.views ?? 0,
      pushViews: n.pushViews ?? 0,
      walletViews: n.walletViews ?? 0,
      recipientCount: recipients ? n.recipientCount ?? recipients.length : null,
      returned: recipients ? returned : null,
      visits: recipients ? visits : null,
      coupon: n.couponId ? coupons.get(n.couponId) ?? null : null,
      inProgress: now < windowEnd,
    };
  });

  return Response.json({ campaigns, windowDays: RETURN_WINDOW_DAYS });
}
