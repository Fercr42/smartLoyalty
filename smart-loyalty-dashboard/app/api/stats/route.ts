import { NextRequest } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "../../firebase/admin";

export const runtime = "nodejs";

const DAYS = 30;

// Datos de los últimos 30 días para el panel de estadísticas.
// Las fechas van en milisegundos: el navegador las agrupa por día y hora en la zona del dueño.
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
  const since = Timestamp.fromMillis(Date.now() - DAYS * 86_400_000);
  const [company, members, newMembers, devices, events, notifications] = await Promise.all([
    companyRef.get(),
    companyRef.collection("walletMembers").count().get(),
    companyRef.collection("walletMembers").where("createdAt", ">=", since).count().get(),
    companyRef.collection("subscribers").count().get(),
    companyRef.collection("loyaltyEvents").where("at", ">=", since).select("type", "at", "memberId").get(),
    companyRef.collection("notifications").where("createdAt", ">=", since).select("sent", "views", "walletViews").get(),
  ]);

  let sent = 0;
  let views = 0;
  let walletViews = 0;
  notifications.docs.forEach((d) => {
    sent += d.data().sent ?? 0;
    views += d.data().views ?? 0;
    walletViews += d.data().walletViews ?? 0;
  });

  return Response.json({
    days: DAYS,
    members: members.data().count,
    newMembers: newMembers.data().count,
    devices: devices.data().count,
    events: events.docs
      .map((d) => ({ type: d.data().type, at: d.data().at?.toMillis?.() ?? 0, memberId: d.data().memberId }))
      .filter((e) => e.at),
    notifications: { count: notifications.size, sent, views, walletViews },
    reviewClicks: company.data()?.reviews?.clicks ?? 0,
  });
}
