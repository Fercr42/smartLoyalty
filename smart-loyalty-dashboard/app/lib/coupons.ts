import { FieldValue, Timestamp, type DocumentReference } from "firebase-admin/firestore";
import { addDaysYmd, localParts } from "./time";

// Cupones de un solo uso: companies/{id}/coupons/{couponId}, y quién ya lo usó en .../redemptions/{memberId}.
// memberIds (opcional) limita el cupón a ciertos clientes (cumpleaños, "te extrañamos").

export type MemberCoupon = { id: string; title: string; expiresDate: string; used: boolean };

const DAY = 86_400_000;

// Cupones vigentes para este cliente y si ya los usó.
export async function memberCoupons(companyRef: DocumentReference, memberId: string): Promise<MemberCoupon[]> {
  const snap = await companyRef.collection("coupons").where("active", "==", true).get();
  const now = Date.now();
  const live = snap.docs.filter((d) => {
    const data = d.data();
    if ((data.expiresAt?.toMillis?.() ?? 0) <= now) return false;
    return !Array.isArray(data.memberIds) || data.memberIds.includes(memberId);
  });
  if (!live.length) return [];
  const redemptions = await companyRef.firestore.getAll(
    ...live.map((d) => d.ref.collection("redemptions").doc(memberId))
  );
  return live.map((d, i) => ({
    id: d.id,
    title: d.data().title ?? "",
    expiresDate: d.data().expiresDate ?? "",
    used: redemptions[i].exists,
  }));
}

// Cupón automático para ciertos clientes, vence al final del día N en la zona del restaurante.
export async function createMemberCoupon(
  companyRef: DocumentReference,
  { title, days, memberIds, timezone }: { title: string; days: number; memberIds: string[]; timezone: string }
) {
  const ref = companyRef.collection("coupons").doc();
  await ref.set({
    title,
    expiresAt: Timestamp.fromMillis(Date.now() + days * DAY),
    expiresDate: addDaysYmd(localParts(timezone).ymd, days),
    active: true,
    redemptions: 0,
    memberIds,
    automatic: true,
    createdAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}
