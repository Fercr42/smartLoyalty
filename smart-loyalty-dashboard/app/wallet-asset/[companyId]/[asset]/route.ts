import { adminDb } from "../../../firebase/admin";
import { dataImageResponse } from "../../../lib/data-image";

export const runtime = "nodejs";

// Imágenes de la tarjeta de Wallet guardadas en companies/{id}/assets (Google las descarga desde aquí).
const ASSETS: Record<string, string> = {
  hero: "walletHero",
  "wide-logo": "walletWideLogo",
  "card-background": "cardBackground",
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ companyId: string; asset: string }> }
) {
  const { companyId, asset } = await params;
  const docId = ASSETS[asset];
  if (!docId) return new Response("No encontrado", { status: 404 });

  const snap = await adminDb().collection("companies").doc(companyId).collection("assets").doc(docId).get();
  return dataImageResponse(snap.data()?.data, "Sin imagen");
}
