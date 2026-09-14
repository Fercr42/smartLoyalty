import { adminDb } from "../../firebase/admin";

export const runtime = "nodejs";

// Foto de portada de la tarjeta de Wallet (Google la descarga desde aquí).
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const { companyId } = await params;
  const snap = await adminDb().collection("companies").doc(companyId).collection("assets").doc("walletHero").get();
  const match = /^data:(image\/[\w+.-]+);base64,(.+)$/.exec(snap.data()?.data ?? "");
  if (!match) return new Response("Sin portada", { status: 404 });

  return new Response(Buffer.from(match[2], "base64"), {
    headers: {
      "Content-Type": match[1],
      "Cache-Control": "public, max-age=300, s-maxage=86400",
    },
  });
}
