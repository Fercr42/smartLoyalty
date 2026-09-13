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
const IMAGE = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
const MAX_IMAGE = 2_800_000; // caracteres base64 (~2 MB de foto)
const PART_SIZE = 900_000; // un documento de Firestore admite máx. 1 MB: la foto se guarda en partes

const bad = (error: string, status = 400) => Response.json({ error }, { status });

export async function POST(req: NextRequest) {
  const idToken = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!idToken) return bad("No autorizado", 401);

  let uid: string;
  try {
    uid = (await adminAuth().verifyIdToken(idToken)).uid;
  } catch {
    return bad("Sesión inválida", 401);
  }

  const { type, title, body, imageData, ctaLabel, ctaUrl } = await req.json();
  if (!TYPES.includes(type)) return bad("Tipo inválido");
  if (!title?.trim() || title.length > 65) return bad("El título es obligatorio (máx. 65)");
  if (!body?.trim() || body.length > 240) return bad("El mensaje es obligatorio (máx. 240)");
  if (imageData && (imageData.length > MAX_IMAGE || !IMAGE.test(imageData)))
    return bad("La foto debe ser JPG, PNG o WebP de menos de 2 MB");
  if (ctaUrl && !/^https:\/\/\S+$/.test(ctaUrl)) return bad("El enlace del botón debe empezar con https://");
  if (ctaLabel && ctaLabel.length > 30) return bad("El texto del botón es muy largo (máx. 30)");

  const db = adminDb();
  const companyRef = db.collection("companies").doc(uid);
  const company = await companyRef.get();
  if (!company.exists) return bad("Primero registra tu empresa");

  const origin = req.nextUrl.origin;
  const rawLogo: string = company.data()?.logoUrl ?? "";
  const logoUrl = rawLogo.startsWith("/") ? `${origin}${rawLogo}` : rawLogo;

  const notificationRef = companyRef.collection("notifications").doc();
  const promoUrl = `${origin}/promo/${uid}/${notificationRef.id}`;
  const imageUrl = imageData ? `${promoUrl}/image` : "";

  // Guardar antes de enviar: la página de la promo debe existir cuando el cliente toque la notificación.
  if (imageData) {
    const images = companyRef.collection("promoImages");
    const batch = db.batch();
    let parts = 0;
    for (let i = 0; i < imageData.length; i += PART_SIZE, parts++) {
      batch.set(images.doc(`${notificationRef.id}_${parts}`), { data: imageData.slice(i, i + PART_SIZE) });
    }
    batch.set(images.doc(notificationRef.id), { parts });
    await batch.commit();
  }
  await notificationRef.set({
    type,
    title: title.trim(),
    body: body.trim(),
    hasImage: Boolean(imageData),
    ctaLabel: ctaUrl ? ctaLabel?.trim() || "Ver más" : "",
    ctaUrl: ctaUrl?.trim() ?? "",
    sent: 0,
    failed: 0,
    createdAt: FieldValue.serverTimestamp(),
  });

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
      data: { type, link: promoUrl },
      webpush: {
        notification: {
          ...(logoUrl ? { icon: logoUrl } : {}),
          // La foto grande solo se ve en Android y computadora; iPhone la ignora.
          ...(imageUrl ? { image: imageUrl } : {}),
        },
        // FCM exige HTTPS en el link (en localhost se omite).
        ...(promoUrl.startsWith("https://") ? { fcmOptions: { link: promoUrl } } : {}),
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

  await notificationRef.update({ sent, failed });

  return Response.json({ sent, failed, removed: dead.length, promoUrl });
}
