import { NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "../../../firebase/admin";
import { cleanAutomations } from "../../../lib/automations-config";
import { memberCoupons } from "../../../lib/coupons";
import { cleanRewards } from "../../../lib/rewards";

export const runtime = "nodejs";

const COMPANY_ID = /^[A-Za-z0-9]{10,64}$/;
const MEMBER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function validBirthday(value: unknown) {
  if (typeof value !== "string" || !/^\d{2}-\d{2}$/.test(value)) return null;
  const [month, day] = value.split("-").map(Number);
  return month >= 1 && month <= 12 && day >= 1 && day <= DAYS_IN_MONTH[month - 1] ? value : null;
}

// Tarjeta del cliente en la página del QR: sellos, cupones y cumpleaños. Crea el registro la primera vez.
// Si llega "birthday" (MM-DD) se guarda, solo una vez.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { companyId, memberId } = body;
  if (!COMPANY_ID.test(companyId ?? "") || !MEMBER_ID.test(memberId ?? "")) {
    return Response.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const companyRef = adminDb().collection("companies").doc(companyId);
  const company = await companyRef.get();
  if (!company.exists) return Response.json({ error: "Restaurante no encontrado" }, { status: 404 });

  const rewards = cleanRewards(company.data()?.loyalty?.rewards);
  const birthdaySettings = cleanAutomations(company.data()?.automations).birthday;
  const coupons = await memberCoupons(companyRef, memberId);
  if (!rewards.length && !coupons.length && !birthdaySettings.enabled) return Response.json({ enabled: false });

  const memberRef = companyRef.collection("walletMembers").doc(memberId);
  await memberRef
    .create({ platform: "web", stamps: 0, totalVisits: 0, createdAt: FieldValue.serverTimestamp() })
    .catch(() => {}); // ya existía
  let member = (await memberRef.get()).data() ?? {};

  if (body.birthday !== undefined) {
    const birthday = validBirthday(body.birthday);
    if (!birthday) return Response.json({ error: "Fecha de cumpleaños no válida" }, { status: 400 });
    if (member.birthday) return Response.json({ error: "Tu cumpleaños ya está registrado" }, { status: 409 });
    await memberRef.update({ birthday, birthdaySetAt: FieldValue.serverTimestamp() });
    member = { ...member, birthday };
  }

  return Response.json({
    enabled: true,
    memberId,
    code: memberId.slice(0, 8).toUpperCase(),
    stamps: member.stamps ?? 0,
    rewards,
    coupons,
    birthday: member.birthday ?? null,
    birthdayEnabled: birthdaySettings.enabled,
    birthdayGift: birthdaySettings.gift,
  });
}
