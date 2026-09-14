import { FieldPath } from "firebase-admin/firestore";
import { adminDb, adminMessaging } from "../firebase/admin";
import { DEAD_TOKEN } from "./send-notification";

// Limpieza diaria de celulares suscritos que ya no existen (bloquearon notificaciones, borraron datos,
// cambiaron de celular). Usa FCM en modo prueba (dryRun): valida cada token sin enviar nada.
// Revisa por tandas en cada ejecución del cron y guarda por dónde va en system/subscriberCleanup.

const PER_RUN = 1500;

// Una tarjeta de cliente vive en un solo navegador: si tiene varios tokens, los viejos son de antes
// de que Firebase le cambiara el token a ese celular. Se deja solo el más reciente.
async function removeDuplicateDevices() {
  const db = adminDb();
  const subs = await db.collectionGroup("subscribers").select("memberId", "createdAt").get();
  const newest = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>();
  const duplicates: FirebaseFirestore.DocumentReference[] = [];
  for (const d of subs.docs) {
    const memberId = d.data().memberId;
    if (!memberId) continue;
    const key = `${d.ref.parent.path}/${memberId}`;
    const current = newest.get(key);
    if (!current) {
      newest.set(key, d);
      continue;
    }
    const time = (s: FirebaseFirestore.QueryDocumentSnapshot) => s.data().createdAt?.toMillis?.() ?? 0;
    if (time(d) > time(current)) {
      duplicates.push(current.ref);
      newest.set(key, d);
    } else {
      duplicates.push(d.ref);
    }
  }
  for (let i = 0; i < duplicates.length; i += 500) {
    const batch = db.batch();
    duplicates.slice(i, i + 500).forEach((ref) => batch.delete(ref));
    await batch.commit();
  }
  return duplicates.length;
}

export async function cleanupSubscribers() {
  const db = adminDb();
  const stateRef = db.collection("system").doc("subscriberCleanup");
  const today = new Date().toISOString().slice(0, 10);
  const state = (await stateRef.get()).data() ?? {};
  if (state.date === today && state.done) return { skipped: true };
  const duplicatesRemoved = state.date === today ? 0 : await removeDuplicateDevices();

  let query = db.collectionGroup("subscribers").orderBy(FieldPath.documentId()).limit(PER_RUN);
  if (state.date === today && state.cursor) query = query.startAfter(state.cursor);
  const snap = await query.get();

  let checked = 0;
  let removed = 0;
  for (let i = 0; i < snap.docs.length; i += 500) {
    const chunk = snap.docs.slice(i, i + 500);
    const res = await adminMessaging().sendEach(
      chunk.map((d) => ({ token: d.id, data: { check: "1" } })),
      true // dryRun: no se envía nada al celular
    );
    const batch = db.batch();
    let dead = 0;
    res.responses.forEach((r, j) => {
      if (r.error && DEAD_TOKEN.includes(r.error.code)) {
        batch.delete(chunk[j].ref);
        dead++;
      }
    });
    if (dead) await batch.commit();
    checked += chunk.length;
    removed += dead;
  }

  const done = snap.size < PER_RUN;
  await stateRef.set({
    date: today,
    done,
    cursor: done ? null : snap.docs[snap.docs.length - 1].ref.path,
    checked: (state.date === today ? state.checked ?? 0 : 0) + checked,
    removed: (state.date === today ? state.removed ?? 0 : 0) + removed,
    duplicatesRemoved: (state.date === today ? state.duplicatesRemoved ?? 0 : 0) + duplicatesRemoved,
  });
  return { checked, removed, duplicatesRemoved, done };
}
