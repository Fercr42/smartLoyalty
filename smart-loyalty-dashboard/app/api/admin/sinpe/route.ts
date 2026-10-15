import { NextRequest } from "next/server";
import { adminDb } from "../../../firebase/admin";
import { requireAdmin } from "../../../lib/admin-auth";
import { sendEmail } from "../../../lib/email";
import { formatColones } from "../../../lib/format-money";
import { approvePayment, PAYMENTS, rejectPayment } from "../../../lib/sinpe";

export const runtime = "nodejs";

const TIER_NAMES: Record<string, string> = { esencial: "Esencial", pro: "Pro", multi: "Multi-local" };
const formatDate = (ms: number) => new Date(ms).toLocaleDateString("es-CR", { day: "numeric", month: "long", year: "numeric" });

// Pagos por SINPE Móvil en revisión (los más viejos primero).
export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof Response) return admin;
  const snap = await adminDb().collection(PAYMENTS).where("status", "==", "pending").limit(200).get();
  const payments = snap.docs
    .map((d) => {
      const p = d.data();
      return {
        id: d.id,
        companyId: p.companyId,
        companyName: p.companyName,
        ownerEmail: p.ownerEmail,
        tier: p.tier,
        period: p.period,
        amountCrc: p.amountCrc,
        reference: p.reference,
        receipt: p.receipt,
        createdAt: p.createdAt?.toMillis?.() ?? null,
      };
    })
    .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
  return Response.json({ payments });
}

// Aprobar (activa el plan) o rechazar (con motivo). Avisa al dueño por correo.
export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof Response) return admin;
  const { id, action, note } = await req.json().catch(() => ({}));
  if (typeof id !== "string" || !/^[A-Za-z0-9]{10,40}$/.test(id)) return Response.json({ error: "Pago inválido" }, { status: 400 });

  if (action === "approve") {
    const result = await approvePayment(id, admin.email);
    if (!result) return Response.json({ error: "Este pago ya fue revisado" }, { status: 409 });
    const { plan, payment } = result;
    if (payment.ownerEmail) {
      await sendEmail({
        to: payment.ownerEmail,
        subject: "Tu plan de Smart Loyalty está activo",
        text: `Recibimos tu SINPE de ${formatColones(payment.amountCrc)}. Tu plan ${TIER_NAMES[payment.tier]} está activo hasta el ${formatDate(plan.paidUntil)}.\n\n¡Gracias!`,
      }).catch((e) => console.error("Correo SINPE aprobado", e));
    }
    return Response.json({ ok: true, plan });
  }

  if (action === "reject") {
    const reason = String(note ?? "").replace(/[\r\n]+/g, " ").trim();
    const payment = await rejectPayment(id, admin.email, reason);
    if (!payment) return Response.json({ error: "Este pago ya fue revisado" }, { status: 409 });
    if (payment.ownerEmail) {
      await sendEmail({
        to: payment.ownerEmail,
        subject: "No pudimos confirmar tu SINPE",
        text: `No encontramos tu SINPE de ${formatColones(payment.amountCrc)} con el comprobante ${payment.receipt}.${reason ? `\n\nMotivo: ${reason}` : ""}\n\nRevisa el número y vuelve a reportarlo en la sección Tu plan, o responde este correo.`,
      }).catch((e) => console.error("Correo SINPE rechazado", e));
    }
    return Response.json({ ok: true });
  }

  return Response.json({ error: "Acción inválida" }, { status: 400 });
}
