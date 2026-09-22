import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "../firebase/admin";

// Liga la tarjeta de un navegador con la cuenta del cliente (correo verificado).
// Una cuenta tiene una tarjeta por restaurante: si ya había una ligada, la de este navegador se une a ella
// (sus puntos y visitas se suman) y se marca con mergedInto para que el escáner use la principal.

export class LinkConflict extends Error {}

export async function linkMember(
  companyId: string,
  memberId: string,
  customer: { uid: string; email: string },
  shareEmail: boolean
) {
  const db = adminDb();
  const members = db.collection("companies").doc(companyId).collection("walletMembers");
  const currentRef = members.doc(memberId);

  const result = await db.runTransaction(async (tx) => {
    const [linked, current] = await Promise.all([
      tx.get(members.where("customerUid", "==", customer.uid).limit(1)),
      tx.get(currentRef),
    ]);
    const emailFields = shareEmail ? { email: customer.email, emailSharedAt: FieldValue.serverTimestamp() } : {};
    const existing = linked.docs[0];
    const c = current.data();

    if (existing && existing.id !== memberId) {
      const e = existing.data();
      const canMerge = c && !c.customerUid && !c.mergedInto;
      const hasProgress = canMerge && ((c.stamps ?? 0) > 0 || (c.totalVisits ?? 0) > 0 || c.birthday || c.name);
      if (hasProgress) {
        const newerVisit = c.lastStampAt && (!e.lastStampAt || c.lastStampAt.toMillis() > e.lastStampAt.toMillis());
        tx.update(existing.ref, {
          stamps: FieldValue.increment(c.stamps ?? 0),
          totalVisits: FieldValue.increment(c.totalVisits ?? 0),
          ...(newerVisit ? { lastStampAt: c.lastStampAt } : {}),
          ...(!e.birthday && c.birthday ? { birthday: c.birthday } : {}),
          ...(!e.name && c.name ? { name: c.name } : {}),
          ...emailFields,
        });
      } else if (shareEmail) {
        tx.update(existing.ref, emailFields);
      }
      if (canMerge) tx.update(currentRef, { mergedInto: existing.id, stamps: 0, totalVisits: 0 });
      return { memberId: existing.id, merged: Boolean(canMerge) };
    }

    if (c?.customerUid && c.customerUid !== customer.uid) {
      throw new LinkConflict("Esta tarjeta ya está protegida con otro correo");
    }
    tx.set(
      currentRef,
      {
        ...(current.exists ? {} : { platform: "web", stamps: 0, totalVisits: 0, createdAt: FieldValue.serverTimestamp() }),
        customerUid: customer.uid,
        linkedAt: FieldValue.serverTimestamp(),
        ...emailFields,
      },
      { merge: true }
    );
    return { memberId, merged: false };
  });

  // Los celulares suscritos de la tarjeta unida pasan a la tarjeta principal.
  if (result.merged) {
    const subs = await db
      .collection("companies")
      .doc(companyId)
      .collection("subscribers")
      .where("memberId", "==", memberId)
      .get();
    if (!subs.empty) {
      const batch = db.batch();
      subs.docs.forEach((s) => batch.update(s.ref, { memberId: result.memberId }));
      await batch.commit();
    }
  }

  await db
    .collection("customers")
    .doc(customer.uid)
    .set({ email: customer.email, updatedAt: FieldValue.serverTimestamp() }, { merge: true });

  return result;
}
