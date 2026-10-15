import { NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "../../../firebase/admin";
import { companyLocale } from "../../../i18n/config";
import { messages } from "../../../i18n/messages";
import { cleanAutomations } from "../../../lib/automations-config";
import { memberCoupons } from "../../../lib/coupons";
import { kickCron } from "../../../lib/cron-kick";
import { publicOrigin } from "../../../lib/origin";
import { updateMemberName, type WalletCompany } from "../../../lib/google-wallet";
import { cleanName } from "../../../lib/member-name";
import { cleanLoyalty } from "../../../lib/loyalty-mode";
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

// Tarjeta del cliente en la página del QR: puntos, cupones, cumpleaños y si está protegida con correo.
// Crea el registro la primera vez. Si llega "birthday" (MM-DD) se guarda, solo una vez.
// Si llega "name" se guarda (el cliente lo puede cambiar) y se muestra en su tarjeta de Wallet.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { companyId, memberId } = body;
  if (!COMPANY_ID.test(companyId ?? "") || !MEMBER_ID.test(memberId ?? "")) {
    return Response.json({ error: "Datos inválidos" }, { status: 400 });
  }

  kickCron(publicOrigin(req.nextUrl.origin));

  const companyRef = adminDb().collection("companies").doc(companyId);
  const company = await companyRef.get();
  if (!company.exists) return Response.json({ error: "Restaurante no encontrado" }, { status: 404 });

  const rewards = cleanRewards(company.data()?.loyalty?.rewards);
  const birthdaySettings = cleanAutomations(company.data()?.automations, messages[companyLocale(company.data())].automations.defaults).birthday;
  let coupons = await memberCoupons(companyRef, memberId);
  // El negocio ya usa el programa si tiene premios, cupones, cumpleaños o el escáner con PIN.
  // Con cashback (o sellos sin premios) la tarjeta igual muestra el saldo del cliente.
  const loyalty = cleanLoyalty(company.data()?.loyalty);
  const activo =
    rewards.length > 0 || coupons.length > 0 || birthdaySettings.enabled || Boolean(company.data()?.loyalty?.pinSet);
  if (!activo) return Response.json({ enabled: false });

  const members = companyRef.collection("walletMembers");
  let memberRef = members.doc(memberId);
  await memberRef
    .create({ platform: "web", stamps: 0, totalVisits: 0, createdAt: FieldValue.serverTimestamp() })
    .catch(() => {}); // ya existía
  let member = (await memberRef.get()).data() ?? {};

  // Esta tarjeta se unió a la principal del cliente (la protegió con su correo): mostrar la principal.
  if (member.mergedInto) {
    const main = await members.doc(member.mergedInto).get();
    if (main.exists) {
      memberRef = main.ref;
      member = main.data() ?? {};
      coupons = await memberCoupons(companyRef, main.id);
    }
  }

  if (body.birthday !== undefined) {
    const birthday = validBirthday(body.birthday);
    if (!birthday) return Response.json({ error: "Fecha de cumpleaños no válida" }, { status: 400 });
    if (member.birthday) return Response.json({ error: "Tu cumpleaños ya está registrado" }, { status: 409 });
    await memberRef.update({ birthday, birthdaySetAt: FieldValue.serverTimestamp() });
    member = { ...member, birthday };
  }

  if (body.name !== undefined) {
    const name = cleanName(body.name);
    if (!name) return Response.json({ error: "Escribe tu nombre." }, { status: 400 });
    await memberRef.update({ name, nameSetAt: FieldValue.serverTimestamp() });
    member = { ...member, name };
    await updateMemberName({ ...company.data(), id: companyId } as WalletCompany, memberRef.id, publicOrigin(req.nextUrl.origin), name).catch(
      (e) => console.error("Wallet nombre", e) // el nombre ya quedó guardado
    );
  }

  return Response.json({
    enabled: true,
    memberId: memberRef.id,
    code: memberRef.id.slice(0, 8).toUpperCase(),
    stamps: member.stamps ?? 0,
    rewards,
    coupons,
    birthday: member.birthday ?? null,
    birthdayEnabled: birthdaySettings.enabled,
    birthdayGift: birthdaySettings.gift,
    linked: Boolean(member.customerUid),
    loyalty,
    email: member.email ?? null,
    name: member.name ?? "",
  });
}
