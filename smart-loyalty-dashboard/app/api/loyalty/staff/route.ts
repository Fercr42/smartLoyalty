import { NextRequest } from "next/server";
import { DocumentReference, DocumentSnapshot, FieldPath, FieldValue } from "firebase-admin/firestore";
import { adminDb } from "../../../firebase/admin";
import { maybeNotifyNearReward } from "../../../lib/automations";
import { kickCron } from "../../../lib/cron-kick";
import { memberCoupons } from "../../../lib/coupons";
import {
  applyClassSettings,
  updateMemberCard,
  walletIssuerId,
  WALLET_TEMPLATE_VERSION,
  type WalletCompany,
} from "../../../lib/google-wallet";
import { publicOrigin } from "../../../lib/origin";
import { planState, type Plan } from "../../../lib/plan";
import { cleanRewards } from "../../../lib/rewards";
import { scheduleNotification } from "../../../lib/send-notification";
import { checkPin, readStaffToken, signStaffToken } from "../../../lib/staff-auth";

export const runtime = "nodejs";

// Escáner de empleados: login con PIN, buscar tarjeta, sumar sello, canjear premio y usar cupón.

const COMPANY_ID = /^[A-Za-z0-9]{10,64}$/;
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/;
const STAMP_COOLDOWN_MS = 60_000;
const MAX_PIN_ATTEMPTS = 5;
const LOCK_MS = 10 * 60_000;

class LoyaltyError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

const bad = (error: string, status = 400) => Response.json({ error }, { status });

const memberView = (doc: DocumentSnapshot) => ({
  memberId: doc.id,
  code: doc.id.slice(0, 8).toUpperCase(),
  stamps: doc.data()?.stamps ?? 0,
  totalVisits: doc.data()?.totalVisits ?? 0,
});

async function refreshWalletCard(
  companyRef: DocumentReference,
  company: WalletCompany,
  memberId: string,
  stamps: number,
  origin: string
) {
  if (!walletIssuerId()) return;
  try {
    if (company.loyalty?.walletTemplate !== WALLET_TEMPLATE_VERSION && (await applyClassSettings(company))) {
      await companyRef.update({ "loyalty.walletTemplate": WALLET_TEMPLATE_VERSION });
    }
    await updateMemberCard(company, memberId, stamps, origin);
  } catch (e) {
    console.error("Wallet", e); // el sello ya quedó guardado; la tarjeta se corrige en la próxima sincronización
  }
}

// Primer sello de un cliente: programar una notificación para pedirle reseña en Google (una sola vez).
async function maybeRequestReview(
  companyRef: DocumentReference,
  company: WalletCompany & { reviews?: { enabled?: boolean; url?: string; delayHours?: number } },
  memberId: string,
  origin: string
) {
  const reviews = company.reviews;
  if (!reviews?.enabled || !/^https:\/\/\S+$/.test(reviews.url ?? "")) return;
  if (!planState((company as { plan?: Plan }).plan).allowed) return;
  try {
    const memberRef = companyRef.collection("walletMembers").doc(memberId);
    const [member, device] = await Promise.all([
      memberRef.get(),
      companyRef.collection("subscribers").where("memberId", "==", memberId).limit(1).get(),
    ]);
    if (member.data()?.reviewRequestedAt) return;
    if (device.empty && member.data()?.platform !== "google") return; // no hay cómo avisarle todavía
    const delayHours = Math.min(Math.max(Number(reviews.delayHours) || 2, 1), 48);
    await memberRef.update({ reviewRequestedAt: FieldValue.serverTimestamp() });
    await scheduleNotification(
      company.id,
      {
        type: "aviso",
        kind: "review",
        title: `¿Cómo te fue en ${company.name ?? "tu visita"}?`.slice(0, 65),
        body: "Tu opinión nos ayuda mucho. Toca aquí para dejarnos una reseña en Google.",
        audience: "all",
        ctaLabel: "",
        ctaUrl: "",
        memberIds: [memberId],
        link: `${origin}/r/${company.id}`,
      },
      Date.now() + delayHours * 3_600_000,
      "none"
    );
  } catch (e) {
    console.error("Reseña", e); // el sello ya quedó guardado
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { action, companyId } = body;
  if (!COMPANY_ID.test(companyId ?? "")) return bad("Restaurante inválido");

  const db = adminDb();
  const companyRef = db.collection("companies").doc(companyId);
  const staffRef = companyRef.collection("private").doc("staff");
  const [company, staff] = await Promise.all([companyRef.get(), staffRef.get()]);
  if (!company.exists) return bad("Restaurante no encontrado", 404);
  const companyData = { ...company.data(), id: companyId } as WalletCompany & { logoUrl?: string };
  const rewards = cleanRewards(companyData.loyalty?.rewards);
  const pin = staff.data() ?? {};

  if (action === "login") {
    if (!pin.pinHash) return bad("El dueño aún no configura el PIN de empleados", 403);
    if ((pin.lockedUntil ?? 0) > Date.now()) return bad("Demasiados intentos. Espera 10 minutos.", 429);
    if (!checkPin(String(body.pin ?? ""), pin)) {
      const failed = (pin.failed ?? 0) + 1;
      const locked = failed >= MAX_PIN_ATTEMPTS;
      await staffRef.update({ failed: locked ? 0 : failed, lockedUntil: locked ? Date.now() + LOCK_MS : 0 });
      return bad(locked ? "Demasiados intentos. Espera 10 minutos." : "PIN incorrecto", locked ? 429 : 401);
    }
    if (pin.failed) await staffRef.update({ failed: 0 });
    return Response.json({
      token: signStaffToken(companyId, pin.pinVersion),
      company: {
        name: companyData.name ?? "",
        logoUrl: companyData.logoUrl ?? "",
        brandColor: companyData.brandColor ?? "",
        rewards,
      },
    });
  }

  const session = readStaffToken(req.headers.get("x-staff-token") ?? "");
  if (!session || session.c !== companyId || session.v !== pin.pinVersion) {
    return bad("Tu sesión terminó. Vuelve a escribir el PIN.", 401);
  }

  const members = companyRef.collection("walletMembers");
  const events = companyRef.collection("loyaltyEvents");

  if (action === "scan") {
    kickCron(publicOrigin(req.nextUrl.origin));
    const raw = String(body.code ?? "").trim().toLowerCase();
    const uuid = raw.match(UUID)?.[0];
    let found: DocumentSnapshot | undefined;
    if (uuid) {
      const doc = await members.doc(uuid).get();
      if (doc.exists) found = doc;
    } else {
      const short = raw.replace(/[^0-9a-f]/g, "");
      if (short.length !== 8) return bad("Código no válido. Son 8 caracteres, ej. 3F9A12BC.");
      const matches = await members
        .orderBy(FieldPath.documentId())
        .startAt(short)
        .endAt(`${short}`)
        .limit(2)
        .get();
      if (matches.size > 1) return bad("Hay más de una tarjeta con ese código. Escanea el QR.");
      found = matches.docs[0];
    }
    if (!found) return bad("Tarjeta no encontrada en este restaurante", 404);
    return Response.json({ member: memberView(found), rewards, coupons: await memberCoupons(companyRef, found.id) });
  }

  if (!["stamp", "redeem", "coupon"].includes(action)) return bad("Acción inválida");
  const memberId = String(body.memberId ?? "");
  if (!UUID.test(memberId)) return bad("Tarjeta inválida");
  const memberRef = members.doc(memberId);
  const code = memberId.slice(0, 8).toUpperCase();

  if (action === "coupon") {
    const couponId = String(body.couponId ?? "");
    if (!/^[A-Za-z0-9]{1,40}$/.test(couponId)) return bad("Cupón inválido");
    const couponRef = companyRef.collection("coupons").doc(couponId);
    const redemptionRef = couponRef.collection("redemptions").doc(memberId);
    try {
      await db.runTransaction(async (tx) => {
        const [coupon, redemption, member] = await Promise.all([
          tx.get(couponRef),
          tx.get(redemptionRef),
          tx.get(memberRef),
        ]);
        if (!member.exists) throw new LoyaltyError("Tarjeta no encontrada", 404);
        if (!coupon.exists || !coupon.data()?.active) throw new LoyaltyError("Este cupón ya no está activo.", 400);
        if ((coupon.data()?.expiresAt?.toMillis?.() ?? 0) <= Date.now()) throw new LoyaltyError("Este cupón ya venció.", 400);
        const onlyFor = coupon.data()?.memberIds;
        if (Array.isArray(onlyFor) && !onlyFor.includes(memberId)) {
          throw new LoyaltyError("Este cupón es para otro cliente.", 403);
        }
        if (redemption.exists) throw new LoyaltyError("Este cliente ya usó este cupón.", 409);
        tx.create(redemptionRef, { at: FieldValue.serverTimestamp() });
        tx.update(couponRef, { redemptions: FieldValue.increment(1) });
        tx.set(events.doc(), {
          memberId,
          code,
          type: "coupon",
          couponId,
          couponTitle: coupon.data()?.title ?? "",
          at: FieldValue.serverTimestamp(),
        });
      });
    } catch (e) {
      if (e instanceof LoyaltyError) return bad(e.message, e.status);
      throw e;
    }
    return Response.json({ couponId, used: true });
  }

  const reward = action === "redeem" ? rewards.find((r) => r.id === body.rewardId) : undefined;
  if (action === "redeem" && !reward) return bad("Recompensa no encontrada");

  let stamps = 0;
  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(memberRef);
      if (!snap.exists) throw new LoyaltyError("Tarjeta no encontrada", 404);
      const current = snap.data()?.stamps ?? 0;
      const event = { memberId, code, at: FieldValue.serverTimestamp() };

      if (action === "stamp") {
        const last = snap.data()?.lastStampAt?.toMillis?.() ?? 0;
        if (!body.force && Date.now() - last < STAMP_COOLDOWN_MS) {
          throw new LoyaltyError("A esta tarjeta ya se le sumó un sello hace menos de 1 minuto.", 409);
        }
        stamps = current + 1;
        tx.update(memberRef, {
          stamps,
          totalVisits: FieldValue.increment(1),
          lastStampAt: FieldValue.serverTimestamp(),
        });
        tx.set(events.doc(), { ...event, type: "stamp", amount: 1, stampsAfter: stamps });
      } else {
        if (current < reward!.stamps) {
          throw new LoyaltyError(`Le faltan ${reward!.stamps - current} sellos para "${reward!.title}".`, 400);
        }
        stamps = current - reward!.stamps;
        tx.update(memberRef, { stamps, lastRedeemAt: FieldValue.serverTimestamp() });
        tx.set(events.doc(), {
          ...event,
          type: "redeem",
          amount: -reward!.stamps,
          rewardId: reward!.id,
          rewardTitle: reward!.title,
          stampsAfter: stamps,
        });
      }
    });
  } catch (e) {
    if (e instanceof LoyaltyError) return bad(e.message, e.status);
    throw e;
  }

  const origin = publicOrigin(req.nextUrl.origin);
  await refreshWalletCard(companyRef, companyData, memberId, stamps, origin);
  if (action === "stamp") {
    await maybeRequestReview(companyRef, companyData, memberId, origin);
    await maybeNotifyNearReward(companyRef, companyData, memberId, stamps);
  }
  return Response.json({ stamps });
}
