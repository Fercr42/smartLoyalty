import { FieldValue } from "firebase-admin/firestore";
import { adminDb, adminMessaging } from "../firebase/admin";
import { DEAD_TOKEN } from "./send-notification";

// Avisos al dueño en la app "Smart Loyalty Negocios" (celulares en companies/{id}/ownerDevices).

const devices = (companyId: string) => adminDb().collection("companies").doc(companyId).collection("ownerDevices");

export async function saveOwnerDevice(companyId: string, token: string, platform: string) {
  await devices(companyId).doc(token).set({ token, platform, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
}

export async function notifyOwner(companyId: string, title: string, body: string, link = "/panel") {
  const snap = await devices(companyId).get();
  const tokens = snap.docs.map((d) => d.id);
  if (!tokens.length) return 0;
  const res = await adminMessaging().sendEachForMulticast({
    tokens,
    notification: { title: title.slice(0, 65), body: body.slice(0, 200) },
    data: { link },
  });
  const dead = res.responses.map((r, i) => (r.error && DEAD_TOKEN.includes(r.error.code) ? tokens[i] : "")).filter(Boolean);
  await Promise.all(dead.map((t) => devices(companyId).doc(t).delete()));
  return res.successCount;
}
