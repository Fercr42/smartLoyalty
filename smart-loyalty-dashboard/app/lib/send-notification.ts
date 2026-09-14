import { DocumentReference, FieldValue, Timestamp } from "firebase-admin/firestore";
import type { MulticastMessage } from "firebase-admin/messaging";
import { adminDb, adminMessaging } from "../firebase/admin";
import { notifyWalletHolders, notifyWalletMember, walletIssuerId } from "./google-wallet";
import { planState } from "./plan";
import { cleanRewards, type Reward } from "./rewards";

// Envío de notificaciones: ahora, programadas (scheduledJobs) y por grupo de clientes.

export const NOTIFICATION_TYPES = ["promo", "horario", "evento", "aviso"];
export const AUDIENCES = ["all", "frequent", "inactive", "near_reward"] as const;
export type Audience = (typeof AUDIENCES)[number];
export const REPEATS = ["none", "daily", "weekly"] as const;
export type Repeat = (typeof REPEATS)[number];

export const FREQUENT_VISITS = 5;
export const INACTIVE_DAYS = 30;

const DAY = 86_400_000;
const DEAD_TOKEN = [
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
];
const IMAGE = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
const MAX_IMAGE = 2_800_000; // caracteres base64 (~2 MB de foto)
const PART_SIZE = 900_000; // un documento de Firestore admite máx. 1 MB: la foto se guarda en partes
const CLAIM_MS = 10 * 60_000;
const MAX_ATTEMPTS = 3;

export class InputError extends Error {}

// Lo que queda guardado para enviar, ahora o después.
export type StoredNotification = {
  type: string;
  title: string;
  body: string;
  audience: Audience;
  ctaLabel: string;
  ctaUrl: string;
  imageId?: string;
  couponId?: string;
  memberIds?: string[]; // solo estos clientes (ej. pedir reseña)
  link?: string; // abrir este enlace en vez de la página de la promo
  kind?: "review" | "near_reward" | "birthday" | "winback"; // envíos automáticos (se muestran distinto en el historial)
};

type MemberData = { stamps?: number; totalVisits?: number; lastStampAt?: Timestamp };

export function parseNotificationInput(raw: Record<string, unknown>) {
  const s = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const type = s(raw.type);
  const title = s(raw.title);
  const body = s(raw.body);
  const imageData = s(raw.imageData);
  const ctaUrl = s(raw.ctaUrl);
  const ctaLabel = s(raw.ctaLabel);

  if (!NOTIFICATION_TYPES.includes(type)) throw new InputError("Tipo inválido");
  if (!title || title.length > 65) throw new InputError("El título es obligatorio (máx. 65)");
  if (!body || body.length > 240) throw new InputError("El mensaje es obligatorio (máx. 240)");
  if (imageData && (imageData.length > MAX_IMAGE || !IMAGE.test(imageData)))
    throw new InputError("La foto debe ser JPG, PNG o WebP de menos de 2 MB");
  if (ctaUrl && !/^https:\/\/\S+$/.test(ctaUrl)) throw new InputError("El enlace del botón debe empezar con https://");
  if (ctaLabel.length > 30) throw new InputError("El texto del botón es muy largo (máx. 30)");

  const audience = (AUDIENCES as readonly string[]).includes(s(raw.audience)) ? (s(raw.audience) as Audience) : "all";

  let coupon: { title: string; expiresAt: number; expiresDate: string } | undefined;
  if (raw.coupon && typeof raw.coupon === "object") {
    const c = raw.coupon as Record<string, unknown>;
    const couponTitle = s(c.title);
    const expiresAt = Number(c.expiresAt);
    const expiresDate = s(c.expiresDate);
    if (!couponTitle || couponTitle.length > 60) throw new InputError("El cupón necesita un nombre (máx. 60)");
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now() || expiresAt > Date.now() + 366 * DAY || !/^\d{4}-\d{2}-\d{2}$/.test(expiresDate))
      throw new InputError("La fecha de vencimiento del cupón no es válida");
    coupon = { title: couponTitle, expiresAt, expiresDate };
  }

  let schedule: { sendAt: number; repeat: Repeat } | undefined;
  if (raw.sendAt != null) {
    const sendAt = Number(raw.sendAt);
    if (!Number.isFinite(sendAt) || sendAt < Date.now() - 60_000 || sendAt > Date.now() + 366 * DAY)
      throw new InputError("La fecha de envío no es válida");
    const repeat = (REPEATS as readonly string[]).includes(s(raw.repeat)) ? (s(raw.repeat) as Repeat) : "none";
    schedule = { sendAt, repeat };
  }

  return { type, title, body, imageData, ctaLabel: ctaUrl ? ctaLabel || "Ver más" : "", ctaUrl, audience, coupon, schedule };
}

export type NotificationInput = ReturnType<typeof parseNotificationInput>;

// Guarda foto y cupón; devuelve lo necesario para enviar (ahora o en cada repetición).
export async function prepareNotification(
  companyRef: DocumentReference,
  input: NotificationInput
): Promise<StoredNotification> {
  let imageId: string | undefined;
  if (input.imageData) {
    const images = companyRef.collection("promoImages");
    imageId = images.doc().id;
    const batch = companyRef.firestore.batch();
    let parts = 0;
    for (let i = 0; i < input.imageData.length; i += PART_SIZE, parts++) {
      batch.set(images.doc(`${imageId}_${parts}`), { data: input.imageData.slice(i, i + PART_SIZE) });
    }
    batch.set(images.doc(imageId), { parts });
    await batch.commit();
  }

  let couponId: string | undefined;
  if (input.coupon) {
    const ref = companyRef.collection("coupons").doc();
    await ref.set({
      title: input.coupon.title,
      expiresAt: Timestamp.fromMillis(input.coupon.expiresAt),
      expiresDate: input.coupon.expiresDate,
      active: true,
      redemptions: 0,
      createdAt: FieldValue.serverTimestamp(),
    });
    couponId = ref.id;
  }

  return {
    type: input.type,
    title: input.title,
    body: input.body,
    audience: input.audience,
    ctaLabel: input.ctaLabel,
    ctaUrl: input.ctaUrl,
    ...(imageId ? { imageId } : {}),
    ...(couponId ? { couponId } : {}),
  };
}

export function inAudience(audience: Audience, member: MemberData, rewards: Reward[], now = Date.now()) {
  const visits = member.totalVisits ?? 0;
  const stamps = member.stamps ?? 0;
  const lastVisit = member.lastStampAt?.toMillis?.() ?? 0;
  switch (audience) {
    case "all":
      return true;
    case "frequent":
      return visits >= FREQUENT_VISITS;
    case "inactive":
      return visits > 0 && now - lastVisit > INACTIVE_DAYS * DAY;
    case "near_reward":
      return rewards.some((r) => r.stamps - stamps === 1);
  }
}

// Cuántos celulares y clientes hay en cada grupo (para el panel).
export async function audienceCounts(companyRef: DocumentReference) {
  const [company, members, subs] = await Promise.all([
    companyRef.get(),
    companyRef.collection("walletMembers").get(),
    companyRef.collection("subscribers").where("channel", "==", "webpush").get(),
  ]);
  const rewards = cleanRewards(company.data()?.loyalty?.rewards);
  const counts = {} as Record<Audience, { devices: number; members: number }>;
  for (const audience of AUDIENCES) {
    if (audience === "all") {
      counts.all = { devices: subs.size, members: members.size };
      continue;
    }
    const ids = new Set(members.docs.filter((d) => inAudience(audience, d.data(), rewards)).map((d) => d.id));
    counts[audience] = {
      members: ids.size,
      devices: subs.docs.filter((s) => ids.has(s.data().memberId)).length,
    };
  }
  return counts;
}

export async function sendNotification(companyId: string, payload: StoredNotification, origin: string) {
  const db = adminDb();
  const companyRef = db.collection("companies").doc(companyId);
  const company = await companyRef.get();
  if (!company.exists) throw new InputError("Primero registra tu empresa");
  const data = company.data()!;

  const rawLogo: string = data.logoUrl ?? "";
  const logoUrl = rawLogo.startsWith("/") ? `${origin}${rawLogo}` : rawLogo;
  const notificationRef = companyRef.collection("notifications").doc();
  const promoUrl = `${origin}/promo/${companyId}/${notificationRef.id}`;
  const link = payload.link || promoUrl;
  const imageUrl = payload.imageId ? `${promoUrl}/image` : "";

  // Guardar antes de enviar: la página de la promo debe existir cuando el cliente toque la notificación.
  await notificationRef.set({
    type: payload.type,
    title: payload.title,
    body: payload.body,
    hasImage: Boolean(payload.imageId),
    ...(payload.imageId ? { imageId: payload.imageId } : {}),
    ...(payload.couponId ? { couponId: payload.couponId } : {}),
    ctaLabel: payload.ctaLabel ?? "",
    ctaUrl: payload.ctaUrl ?? "",
    audience: payload.memberIds ? "members" : payload.audience,
    ...(payload.kind ? { kind: payload.kind } : {}),
    sent: 0,
    failed: 0,
    views: 0,
    createdAt: FieldValue.serverTimestamp(),
  });

  // null = todos
  let memberIds: Set<string> | null = null;
  if (payload.memberIds) {
    memberIds = new Set(payload.memberIds);
  } else if (payload.audience !== "all") {
    const members = await companyRef.collection("walletMembers").get();
    const rewards = cleanRewards(data.loyalty?.rewards);
    memberIds = new Set(members.docs.filter((d) => inAudience(payload.audience, d.data(), rewards)).map((d) => d.id));
  }

  const subs = await companyRef.collection("subscribers").where("channel", "==", "webpush").get();
  const tokens = subs.docs.filter((d) => !memberIds || memberIds.has(d.data().memberId)).map((d) => d.id);

  let sent = 0;
  let failed = 0;
  const dead: string[] = [];
  for (let i = 0; i < tokens.length; i += 500) {
    const chunk = tokens.slice(i, i + 500);
    const message: MulticastMessage = {
      tokens: chunk,
      notification: { title: payload.title, body: payload.body },
      data: { type: payload.type, link },
      webpush: {
        notification: {
          ...(logoUrl ? { icon: logoUrl } : {}),
          // La foto grande solo se ve en Android y computadora; iPhone la ignora.
          ...(imageUrl ? { image: imageUrl } : {}),
        },
        // FCM exige HTTPS en el link (en localhost se omite).
        ...(link.startsWith("https://") ? { fcmOptions: { link } } : {}),
      },
    };
    const res = await adminMessaging().sendEachForMulticast(message);
    sent += res.successCount;
    failed += res.failureCount;
    res.responses.forEach((r, j) => {
      if (r.error && DEAD_TOKEN.includes(r.error.code)) dead.push(chunk[j]);
    });
  }

  for (let i = 0; i < dead.length; i += 500) {
    const batch = db.batch();
    dead.slice(i, i + 500).forEach((t) => batch.delete(companyRef.collection("subscribers").doc(t)));
    await batch.commit();
  }

  let wallet = "off";
  if (walletIssuerId()) {
    try {
      if (!memberIds) {
        wallet = await notifyWalletHolders(companyId, payload.title, payload.body);
      } else {
        let delivered = 0;
        const ids = [...memberIds];
        for (let i = 0; i < ids.length; i += 10) {
          const results = await Promise.all(
            ids.slice(i, i + 10).map((id) => notifyWalletMember(companyId, id, payload.title, payload.body))
          );
          delivered += results.filter(Boolean).length;
        }
        wallet = delivered ? "ok" : "sin-tarjetas";
      }
    } catch (e) {
      console.error(e);
      wallet = "error";
    }
  }

  await notificationRef.update({ sent, failed, wallet });
  return { sent, failed, removed: dead.length, promoUrl, wallet, notificationId: notificationRef.id };
}

type ScheduledJob = {
  companyId: string;
  payload: StoredNotification;
  sendAt: Timestamp;
  repeat: Repeat;
  attempts?: number;
};

export async function scheduleNotification(
  companyId: string,
  payload: StoredNotification,
  sendAt: number,
  repeat: Repeat
) {
  const ref = adminDb().collection("scheduledJobs").doc();
  await ref.set({
    companyId,
    payload,
    sendAt: Timestamp.fromMillis(sendAt),
    repeat,
    attempts: 0,
    createdAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

// Envía lo que ya tocaba. Cada trabajo se "reclama" moviendo su hora 10 min adelante,
// así dos ejecuciones no lo mandan dos veces; si el envío falla, se reintenta sola (máx. 3).
export async function runDueJobs(origin: string, max = 20) {
  const db = adminDb();
  const now = Date.now();
  const due = await db.collection("scheduledJobs").where("sendAt", "<=", Timestamp.fromMillis(now)).limit(max).get();
  const results: { id: string; sent?: number; error?: boolean; skipped?: string }[] = [];

  for (const doc of due.docs) {
    const job = await db.runTransaction(async (tx) => {
      const snap = await tx.get(doc.ref);
      if (!snap.exists || (snap.data()?.sendAt?.toMillis?.() ?? Infinity) > now) return null;
      tx.update(doc.ref, { sendAt: Timestamp.fromMillis(now + CLAIM_MS), attempts: FieldValue.increment(1) });
      return snap.data() as ScheduledJob;
    });
    if (!job) continue;
    if ((job.attempts ?? 0) >= MAX_ATTEMPTS) {
      await doc.ref.delete();
      continue;
    }
    try {
      const company = await db.collection("companies").doc(job.companyId).get();
      if (!planState(company.data()?.plan).allowed) {
        await doc.ref.delete(); // prueba vencida: no se envía
        results.push({ id: doc.id, skipped: "plan" });
        continue;
      }
      const result = await sendNotification(job.companyId, job.payload, origin);
      if (job.repeat === "daily" || job.repeat === "weekly") {
        const step = job.repeat === "daily" ? DAY : 7 * DAY;
        let next = job.sendAt.toMillis() + step;
        while (next <= now) next += step;
        await doc.ref.update({ sendAt: Timestamp.fromMillis(next), attempts: 0, lastSentAt: FieldValue.serverTimestamp() });
      } else {
        await doc.ref.delete();
      }
      results.push({ id: doc.id, sent: result.sent });
    } catch (e) {
      console.error("Trabajo programado", doc.id, e);
      results.push({ id: doc.id, error: true });
    }
  }
  return results;
}
