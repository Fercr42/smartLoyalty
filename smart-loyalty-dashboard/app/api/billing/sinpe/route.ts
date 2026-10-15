import { NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "../../../firebase/admin";
import { adminEmails, sendEmail } from "../../../lib/email";
import { formatColones } from "../../../lib/format-money";
import { isTier } from "../../../lib/plan";
import { amountFor, isPeriod, PAYMENTS, pendingPayment, RECEIPT, sinpeConfig, sinpeReference } from "../../../lib/sinpe";
import { publicOrigin } from "../../../lib/origin";

export const runtime = "nodejs";

const bad = (error: string, status = 400) => Response.json({ error }, { status });

async function owner(req: NextRequest) {
  const idToken = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!idToken) return bad("No autorizado", 401);
  try {
    const token = await adminAuth().verifyIdToken(idToken);
    return { uid: token.uid, email: token.email ?? "" };
  } catch {
    return bad("Sesión inválida", 401);
  }
}

// Datos para pagar: número, nombre, referencia y si ya hay un pago en revisión.
export async function GET(req: NextRequest) {
  const who = await owner(req);
  if (who instanceof Response) return who;
  const config = sinpeConfig();
  if (!config) return Response.json({ enabled: false });
  const pending = await pendingPayment(who.uid);
  const p = pending?.data();
  return Response.json({
    enabled: true,
    phone: config.phone,
    name: config.name,
    reference: sinpeReference(who.uid),
    pending: p ? { tier: p.tier, period: p.period, amountCrc: p.amountCrc, receipt: p.receipt } : null,
  });
}

// El dueño ya pagó: guarda el comprobante para revisión y avisa al administrador.
export async function POST(req: NextRequest) {
  const who = await owner(req);
  if (who instanceof Response) return who;
  const config = sinpeConfig();
  if (!config) return bad("El pago por SINPE Móvil aún no está disponible.", 503);

  const { tier, period, receipt } = await req.json().catch(() => ({}));
  if (!isTier(tier) || !isPeriod(period)) return bad("Elige un plan válido.");
  const cleanReceipt = String(receipt ?? "").trim();
  if (!RECEIPT.test(cleanReceipt)) return bad("Escribe el número de comprobante del SINPE.");

  const companyRef = adminDb().collection("companies").doc(who.uid);
  const company = await companyRef.get();
  if (!company.exists) return bad("Primero registra tu empresa");
  if (await pendingPayment(who.uid)) return bad("Ya tienes un pago en revisión. Te avisamos por correo al aprobarlo.", 409);

  const amountCrc = amountFor(tier, period);
  const reference = sinpeReference(who.uid);
  const companyName = String(company.data()?.name ?? "").slice(0, 80);
  await adminDb().collection(PAYMENTS).add({
    companyId: who.uid,
    companyName,
    ownerEmail: who.email,
    tier,
    period,
    amountCrc,
    reference,
    receipt: cleanReceipt,
    status: "pending",
    createdAt: FieldValue.serverTimestamp(),
  });

  const admins = adminEmails();
  if (admins.length) {
    await sendEmail({
      to: admins,
      subject: `Pago SINPE por revisar: ${companyName || who.uid}`.replace(/[\r\n]+/g, " "),
      text: [
        `Negocio: ${companyName} (${who.uid})`,
        `Plan: ${tier} · ${period === "year" ? "anual" : "mensual"}`,
        `Monto esperado: ${formatColones(amountCrc)}`,
        `Referencia: ${reference}`,
        `Comprobante: ${cleanReceipt}`,
        "",
        `Revisa tu banco y apruébalo en ${publicOrigin(req.nextUrl.origin)}/admin`,
      ].join("\n"),
    }).catch((e) => console.error("Correo SINPE", e));
  }
  return Response.json({ pending: { tier, period, amountCrc, receipt: cleanReceipt } });
}
