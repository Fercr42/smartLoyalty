import { adminDb } from "../../../firebase/admin";

export const runtime = "nodejs";

// Imágenes de la tarjeta de Wallet guardadas en companies/{id}/assets (Google las descarga desde aquí).
const ASSETS: Record<string, string> = {
  hero: "walletHero",
  "wide-logo": "walletWideLogo",
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ companyId: string; asset: string }> }
) {
  const { companyId, asset } = await params;
  const docId = ASSETS[asset];
  if (!docId) return new Response("No encontrado", { status: 404 });

  const snap = await adminDb().collection("companies").doc(companyId).collection("assets").doc(docId).get();
  const match = /^data:(image\/[\w+.-]+);base64,(.+)$/.exec(snap.data()?.data ?? "");
  if (!match) return new Response("Sin imagen", { status: 404 });

  return new Response(Buffer.from(match[2], "base64"), {
    headers: {
      "Content-Type": match[1],
      "Cache-Control": "public, max-age=300, s-maxage=86400",
    },
  });
}
