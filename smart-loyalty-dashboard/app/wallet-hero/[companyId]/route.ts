import { adminDb } from "../../firebase/admin";
import { dataImageResponse } from "../../lib/data-image";

export const runtime = "nodejs";

// Foto de portada de la tarjeta de Wallet (Google la descarga desde aquí).
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const { companyId } = await params;
  const snap = await adminDb().collection("companies").doc(companyId).collection("assets").doc("walletHero").get();
  return dataImageResponse(snap.data()?.data, "Sin portada");
}
