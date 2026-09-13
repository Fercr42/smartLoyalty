import { NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import type { MulticastMessage } from "firebase-admin/messaging";
import { adminAuth, adminDb, adminMessaging } from "../../firebase/admin";

export const runtime = "nodejs";

const TYPES = ["promo", "horario", "evento", "aviso"];
const DEAD_TOKEN = [
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
];

export async function POST(req: NextRequest) {
  const idToken = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!idToken) return Response.json({ error: "No autorizado" }, { status: 401 });

  let uid: string;
  try {
    uid = (await adminAuth().verifyIdToken(idToken)).uid;
  } catch {
    return Response.json({ error: "Sesión inválida" }, { status: 401 });
  }

  const { type, title, body, url } = await req.json();
  if (!TYPES.includes(type)) return Response.json({ error: "Tipo inválido" }, { status: 400 });
  if (!title?.trim() || title.length > 65)
    return Response.json({ error: "El título es obligatorio (máx. 65)" }, { status: 400 });
  if (!body?.trim() || body.length > 240)
    return Response.json({ error: "El mensaje es obligatorio (máx. 240)" }, { status: 400 });

  const db = adminDb();
  const companyRef = db.collection("companies").doc(uid);
  const company = await companyRef.get();
  if (!company.exists) return Response.json({ error: "Primero registra tu empresa" }, { status: 400 });

  const link = url?.startsWith("https://") ? url : `${req.nextUrl.origin}/join/${uid}`;
  const logoUrl: string = company.data()?.logoUrl ?? "";

  const subs = await companyRef.collection("subscribers").where("channel", "==", "webpush").get();
  const tokens = subs.docs.map((d) => d.id);

  let sent = 0;
  let failed = 0;
  const dead: string[] = [];

  for (let i = 0; i < tokens.length; i += 500) {
    const chunk = tokens.slice(i, i + 500);
    const message: MulticastMessage = {
      tokens: chunk,
      notification: { title: title.trim(), body: body.trim() },
      data: { type, link },
      webpush: {
        notification: logoUrl ? { icon: logoUrl } : {},
        // FCM exige HTTPS en el link (en localhost se omite).
        ...(link.startsWith("https://") ? { fcmOptions: { link } } : {}),
      },
    };
    const res = await adminMessaging().sendEachForMulticast(message);
    sent += res.successCount;
    failed += res.failureCount;
    res.responses.forEach((r, j) => {
      if (r.error && DEAD_TOKEN.includes(r.error.code)) dead.push(chunk[j]);
    });
  }

  for (let i = 0; i < dead.length; i += 500) {
    const batch = db.batch();
    dead.slice(i, i + 500).forEach((t) => batch.delete(companyRef.collection("subscribers").doc(t)));
    await batch.commit();
  }

  await companyRef.collection("notifications").add({
    type,
    title: title.trim(),
    body: body.trim(),
    url: url ?? "",
    sent,
    failed,
    createdAt: FieldValue.serverTimestamp(),
  });

  return Response.json({ sent, failed, removed: dead.length });
}
