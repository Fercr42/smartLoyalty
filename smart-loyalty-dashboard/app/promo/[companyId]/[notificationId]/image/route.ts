import { adminDb } from "../../../../firebase/admin";

export const runtime = "nodejs";

// Foto de la promoción (para la notificación en Android y para la página de la promo).
// Se guarda en partes: promoImages/{imageId} = { parts }, promoImages/{imageId}_0..n = { data }.
// Las notificaciones repetidas comparten la misma foto (imageId); las antiguas usan su propio id.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ companyId: string; notificationId: string }> }
) {
  const { companyId, notificationId } = await params;
  const db = adminDb();
  const companyRef = db.collection("companies").doc(companyId);
  const notification = await companyRef.collection("notifications").doc(notificationId).get();
  const imageId: string = notification.data()?.imageId ?? notificationId;

  const images = companyRef.collection("promoImages");
  const head = (await images.doc(imageId).get()).data();

  let dataUrl: string = head?.data ?? "";
  if (!dataUrl && head?.parts) {
    const parts = await db.getAll(...Array.from({ length: head.parts }, (_, i) => images.doc(`${imageId}_${i}`)));
    dataUrl = parts.map((p) => p.data()?.data ?? "").join("");
  }

  const match = /^data:(image\/[\w+.-]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return new Response("Sin foto", { status: 404 });

  return new Response(Buffer.from(match[2], "base64"), {
    headers: {
      "Content-Type": match[1],
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
