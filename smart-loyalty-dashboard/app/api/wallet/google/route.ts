import { NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "../../../firebase/admin";
import { googleWalletSaveUrl, walletIssuerId } from "../../../lib/google-wallet";
import { DEFAULT_BRAND, safeColor } from "../../../lib/colors";

export const runtime = "nodejs";

const COMPANY_ID = /^[A-Za-z0-9]{10,64}$/;
const MEMBER_ID = /^[0-9a-f-]{36}$/i;

export async function POST(req: NextRequest) {
  if (!walletIssuerId()) {
    return Response.json({ error: "Google Wallet aún no está configurado" }, { status: 503 });
  }
  const { companyId, memberId } = await req.json();
  if (!COMPANY_ID.test(companyId ?? "") || !MEMBER_ID.test(memberId ?? "")) {
    return Response.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const companyRef = adminDb().collection("companies").doc(companyId);
  const company = await companyRef.get();
  if (!company.exists) return Response.json({ error: "Restaurante no encontrado" }, { status: 404 });

  const data = company.data()!;
  const origin = req.nextUrl.origin;
  const rawLogo: string = data.logoUrl ?? "";

  // Registro de tarjetas emitidas (para el conteo del dueño).
  await companyRef
    .collection("walletMembers")
    .doc(memberId)
    .create({ platform: "google", createdAt: FieldValue.serverTimestamp() })
    .catch(() => {}); // ya existía

  const url = googleWalletSaveUrl({
    companyId,
    memberId,
    origin,
    name: data.name ?? "Restaurante",
    description: data.description ?? "",
    logoUrl: rawLogo.startsWith("/") ? `${origin}${rawLogo}` : rawLogo,
    color: safeColor(data.brandColor, DEFAULT_BRAND),
  });
  return Response.json({ url });
}
