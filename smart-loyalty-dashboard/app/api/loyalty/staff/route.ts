import { NextRequest } from "next/server";
import { DocumentReference, DocumentSnapshot, FieldPath, FieldValue } from "firebase-admin/firestore";
import { adminDb } from "../../../firebase/admin";
import {
  applyLoyaltyTemplate,
  updateMemberCard,
  walletIssuerId,
  WALLET_TEMPLATE_VERSION,
  type WalletCompany,
} from "../../../lib/google-wallet";
import { publicOrigin } from "../../../lib/origin";
import { cleanRewards } from "../../../lib/rewards";
import { checkPin, readStaffToken, signStaffToken } from "../../../lib/staff-auth";

export const runtime = "nodejs";

// Escáner de empleados: login con PIN, buscar tarjeta, sumar sello y canjear premio.

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
    if (company.loyalty?.walletTemplate !== WALLET_TEMPLATE_VERSION && (await applyLoyaltyTemplate(company))) {
      await companyRef.update({ "loyalty.walletTemplate": WALLET_TEMPLATE_VERSION });
    }
    await updateMemberCard(company, memberId, stamps, origin);
  } catch (e) {
    console.error("Wallet", e); // el sello ya quedó guardado; la tarjeta se corrige en la próxima sincronización
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

  if (action === "scan") {
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
    return Response.json({ member: memberView(found), rewards });
  }

  if (action !== "stamp" && action !== "redeem") return bad("Acción inválida");
  const memberId = String(body.memberId ?? "");
  if (!UUID.test(memberId)) return bad("Tarjeta inválida");
  const memberRef = members.doc(memberId);
  const reward = action === "redeem" ? rewards.find((r) => r.id === body.rewardId) : undefined;
  if (action === "redeem" && !reward) return bad("Recompensa no encontrada");

  let stamps = 0;
  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(memberRef);
      if (!snap.exists) throw new LoyaltyError("Tarjeta no encontrada", 404);
      const current = snap.data()?.stamps ?? 0;
      const event = {
        memberId,
        code: memberId.slice(0, 8).toUpperCase(),
        at: FieldValue.serverTimestamp(),
      };

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
        tx.set(companyRef.collection("loyaltyEvents").doc(), { ...event, type: "stamp", amount: 1, stampsAfter: stamps });
      } else {
        if (current < reward!.stamps) {
          throw new LoyaltyError(`Le faltan ${reward!.stamps - current} sellos para "${reward!.title}".`, 400);
        }
        stamps = current - reward!.stamps;
        tx.update(memberRef, { stamps, lastRedeemAt: FieldValue.serverTimestamp() });
        tx.set(companyRef.collection("loyaltyEvents").doc(), {
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

  await refreshWalletCard(companyRef, companyData, memberId, stamps, publicOrigin(req.nextUrl.origin));
  return Response.json({ stamps });
}
