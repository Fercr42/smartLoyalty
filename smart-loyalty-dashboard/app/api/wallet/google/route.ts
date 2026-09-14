import { NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "../../../firebase/admin";
import { googleWalletSaveUrl, walletIssuerId, type WalletCompany } from "../../../lib/google-wallet";
import { publicOrigin } from "../../../lib/origin";

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

  // Registro del cliente (para el conteo del dueño y los sellos).
  const memberRef = companyRef.collection("walletMembers").doc(memberId);
  await memberRef
    .create({ platform: "google", stamps: 0, totalVisits: 0, createdAt: FieldValue.serverTimestamp() })
    .catch(() => {}); // ya existía
  const member = await memberRef.get();

  const url = googleWalletSaveUrl({
    company: { ...company.data(), id: companyId } as WalletCompany,
    memberId,
    origin: publicOrigin(req.nextUrl.origin),
    stamps: member.data()?.stamps ?? 0,
  });
  return Response.json({ url });
}
