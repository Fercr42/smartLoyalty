import { NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "../../../firebase/admin";
import { cleanRewards } from "../../../lib/rewards";

export const runtime = "nodejs";

const COMPANY_ID = /^[A-Za-z0-9]{10,64}$/;
const MEMBER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Tarjeta del cliente en la página del QR: crea el registro la primera vez y devuelve sus sellos.
export async function POST(req: NextRequest) {
  const { companyId, memberId } = await req.json().catch(() => ({}));
  if (!COMPANY_ID.test(companyId ?? "") || !MEMBER_ID.test(memberId ?? "")) {
    return Response.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const companyRef = adminDb().collection("companies").doc(companyId);
  const company = await companyRef.get();
  if (!company.exists) return Response.json({ error: "Restaurante no encontrado" }, { status: 404 });

  const rewards = cleanRewards(company.data()?.loyalty?.rewards);
  if (!rewards.length) return Response.json({ enabled: false });

  const memberRef = companyRef.collection("walletMembers").doc(memberId);
  await memberRef
    .create({ platform: "web", stamps: 0, totalVisits: 0, createdAt: FieldValue.serverTimestamp() })
    .catch(() => {}); // ya existía
  const member = (await memberRef.get()).data() ?? {};

  return Response.json({
    enabled: true,
    memberId,
    code: memberId.slice(0, 8).toUpperCase(),
    stamps: member.stamps ?? 0,
    rewards,
  });
}
