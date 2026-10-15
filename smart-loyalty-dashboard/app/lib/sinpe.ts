import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "../firebase/admin";
import { extendPaidUntil, isTier, priceCrc, type Period, type Tier } from "./plan";

// Pago por SINPE Móvil. No hay API pública para confirmar pagos, así que:
// 1) el dueño paga al número de SINPE_PHONE con una referencia única y escribe el número de comprobante,
// 2) queda un pago "pendiente" en sinpePayments y le llega un correo al administrador,
// 3) el administrador revisa su banco y lo aprueba en /admin: el plan se activa por un mes o un año.

export const sinpeConfig = () => {
  const phone = (process.env.SINPE_PHONE ?? "").replace(/[^\d]/g, "");
  return phone.length === 8 ? { phone: `${phone.slice(0, 4)}-${phone.slice(4)}`, name: process.env.SINPE_NAME?.trim() ?? "" } : null;
};

export const PAYMENTS = "sinpePayments";
export const RECEIPT = /^[A-Za-z0-9-]{4,40}$/;
export const isPeriod = (v: unknown): v is Period => v === "month" || v === "year";

// Referencia para el detalle del SINPE: identifica el negocio sin datos personales.
export const sinpeReference = (companyId: string) => `SL-${companyId.slice(0, 6).toUpperCase()}`;

export type SinpePayment = {
  companyId: string;
  companyName: string;
  ownerEmail: string;
  tier: Tier;
  period: Period;
  amountCrc: number;
  reference: string;
  receipt: string;
  status: "pending" | "approved" | "rejected";
  note?: string;
};

export async function pendingPayment(companyId: string) {
  const snap = await adminDb()
    .collection(PAYMENTS)
    .where("companyId", "==", companyId)
    .where("status", "==", "pending")
    .limit(1)
    .get();
  return snap.docs[0] ?? null;
}

// El administrador aprueba: activa el plan desde hoy (o desde el fin del periodo ya pagado por SINPE).
export async function approvePayment(paymentId: string, adminEmail: string) {
  const db = adminDb();
  const ref = db.collection(PAYMENTS).doc(paymentId);
  return db.runTransaction(async (tx) => {
    const payment = await tx.get(ref);
    const data = payment.data() as SinpePayment | undefined;
    if (!data || data.status !== "pending" || !isTier(data.tier) || !isPeriod(data.period)) return null;
    const companyRef = db.collection("companies").doc(data.companyId);
    const current = (await tx.get(companyRef)).data()?.plan ?? {};
    const keep = current.provider === "sinpe" && current.status === "active" ? current.paidUntil : undefined;
    const plan = {
      status: "active",
      provider: "sinpe",
      tier: data.tier,
      period: data.period,
      paidUntil: extendPaidUntil(keep, data.period),
      updatedAt: Date.now(),
      updatedBy: adminEmail,
    };
    tx.update(companyRef, { plan });
    tx.update(ref, { status: "approved", reviewedAt: FieldValue.serverTimestamp(), reviewedBy: adminEmail });
    return { plan, payment: data };
  });
}

export async function rejectPayment(paymentId: string, adminEmail: string, note: string) {
  const ref = adminDb().collection(PAYMENTS).doc(paymentId);
  const snap = await ref.get();
  const data = snap.data() as SinpePayment | undefined;
  if (!data || data.status !== "pending") return null;
  await ref.update({ status: "rejected", note: note.slice(0, 300), reviewedAt: FieldValue.serverTimestamp(), reviewedBy: adminEmail });
  return data;
}

export const amountFor = (tier: Tier, period: Period) => priceCrc(tier, period);
