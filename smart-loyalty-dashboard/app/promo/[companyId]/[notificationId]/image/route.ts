import { adminDb } from "../../../../firebase/admin";

export const runtime = "nodejs";

// Foto de la promoción (para la notificación en Android y para la página de la promo).
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ companyId: string; notificationId: string }> }
) {
  const { companyId, notificationId } = await params;
  const snap = await adminDb()
    .collection("companies")
    .doc(companyId)
    .collection("promoImages")
    .doc(notificationId)
    .get();
  const match = /^data:(image\/[\w+.-]+);base64,(.+)$/.exec(snap.data()?.data ?? "");
  if (!match) return new Response("Sin foto", { status: 404 });

  return new Response(Buffer.from(match[2], "base64"), {
    headers: {
      "Content-Type": match[1],
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
