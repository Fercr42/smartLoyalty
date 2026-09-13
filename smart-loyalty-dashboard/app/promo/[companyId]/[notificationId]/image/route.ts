import { adminDb } from "../../../../firebase/admin";

export const runtime = "nodejs";

// Foto de la promoción (para la notificación en Android y para la página de la promo).
// Se guarda en partes: promoImages/{id} = { parts }, promoImages/{id}_0..n = { data }.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ companyId: string; notificationId: string }> }
) {
  const { companyId, notificationId } = await params;
  const db = adminDb();
  const images = db.collection("companies").doc(companyId).collection("promoImages");
  const head = (await images.doc(notificationId).get()).data();

  let dataUrl: string = head?.data ?? "";
  if (!dataUrl && head?.parts) {
    const parts = await db.getAll(
      ...Array.from({ length: head.parts }, (_, i) => images.doc(`${notificationId}_${i}`))
    );
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
