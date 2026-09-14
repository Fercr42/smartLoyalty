import type { DocumentReference } from "firebase-admin/firestore";

// Cupones de un solo uso: companies/{id}/coupons/{couponId}, y quién ya lo usó en .../redemptions/{memberId}.

export type MemberCoupon = { id: string; title: string; expiresDate: string; used: boolean };

// Cupones vigentes y si este cliente ya los usó.
export async function memberCoupons(companyRef: DocumentReference, memberId: string): Promise<MemberCoupon[]> {
  const snap = await companyRef.collection("coupons").where("active", "==", true).get();
  const now = Date.now();
  const live = snap.docs.filter((d) => (d.data().expiresAt?.toMillis?.() ?? 0) > now);
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
