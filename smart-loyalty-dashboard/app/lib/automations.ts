import { FieldValue, type DocumentReference } from "firebase-admin/firestore";
import { adminDb } from "../firebase/admin";
import {
  AUTOMATIONS_RUN_HOUR,
  cleanAutomations,
  fillTemplate,
  NEAR_REWARD_DELAY_MIN,
} from "./automations-config";
import { createMemberCoupon } from "./coupons";
import { planState, type Plan } from "./plan";
import { cleanRewards } from "./rewards";
import { scheduleNotification, sendNotification } from "./send-notification";
import { isLeapYear, localParts, validTimezone } from "./time";

// Automatizaciones para que los clientes vuelvan: "te falta 1 sello", cumpleaños y "te extrañamos".

const DAY = 86_400_000;

type CompanyData = {
  id: string;
  name?: string;
  plan?: Plan;
  timezone?: string;
  automations?: unknown;
  loyalty?: { rewards?: unknown };
};

// ¿Hay cómo avisarle? (celular suscrito o tarjeta en Google Wallet)
async function canReach(companyRef: DocumentReference, memberId: string, platform?: string) {
  if (platform === "google") return true;
  const device = await companyRef.collection("subscribers").where("memberId", "==", memberId).limit(1).get();
  return !device.empty;
}

// Después de un sello: si al cliente le falta 1 para un premio, avisarle en 30 minutos.
export async function maybeNotifyNearReward(
  companyRef: DocumentReference,
  company: CompanyData,
  memberId: string,
  stamps: number
) {
  const settings = cleanAutomations(company.automations).nearReward;
  if (!settings.enabled || !planState(company.plan).allowed) return;
  const reward = cleanRewards(company.loyalty?.rewards).find((r) => r.stamps - stamps === 1);
  if (!reward) return;
  try {
    const member = await companyRef.collection("walletMembers").doc(memberId).get();
    if (!(await canReach(companyRef, memberId, member.data()?.platform))) return;
    const vars = { premio: reward.title, restaurante: company.name ?? "" };
    await scheduleNotification(
      company.id,
      {
        type: "promo",
        kind: "near_reward",
        title: fillTemplate(settings.title, vars).slice(0, 65),
        body: fillTemplate(settings.message, vars).slice(0, 240),
        audience: "all",
        ctaLabel: "",
        ctaUrl: "",
        memberIds: [memberId],
      },
      Date.now() + NEAR_REWARD_DELAY_MIN * 60_000,
      "none"
    );
  } catch (e) {
    console.error("Te falta 1 sello", e); // el sello ya quedó guardado
  }
}

async function markMembers(companyRef: DocumentReference, ids: string[], fields: Record<string, unknown>) {
  const members = companyRef.collection("walletMembers");
  for (let i = 0; i < ids.length; i += 500) {
    const batch = companyRef.firestore.batch();
    ids.slice(i, i + 500).forEach((id) => batch.update(members.doc(id), fields));
    await batch.commit();
  }
}

// Una vez al día por restaurante (desde las 10 am en su zona horaria): cumpleaños y "te extrañamos".
export async function runAutomations(origin: string) {
  const db = adminDb();
  const companies = await db.collection("companies").where("automationsEnabled", "==", true).get();
  const results: { companyId: string; birthday?: number; winback?: number; error?: boolean }[] = [];

  for (const snap of companies.docs) {
    const company = { ...snap.data(), id: snap.id } as CompanyData;
    const timezone = validTimezone(company.timezone);
    const today = localParts(timezone);
    if (today.hour < AUTOMATIONS_RUN_HOUR || !planState(company.plan).allowed) continue;

    const claimed = await db.runTransaction(async (tx) => {
      const fresh = await tx.get(snap.ref);
      if (fresh.data()?.automationsLastRun === today.ymd) return false;
      tx.update(snap.ref, { automationsLastRun: today.ymd });
      return true;
    });
    if (!claimed) continue;

    const result: (typeof results)[number] = { companyId: snap.id };
    try {
      const settings = cleanAutomations(company.automations);
      const members = await snap.ref.collection("walletMembers").get();
      const vars = { restaurante: company.name ?? "" };

      if (settings.birthday.enabled) {
        const { gift, days } = settings.birthday;
        const ids = members.docs
          .filter((d) => {
            const birthday = d.data().birthday;
            const isToday =
              birthday === today.mmdd || (birthday === "02-29" && today.mmdd === "02-28" && !isLeapYear(today.year));
            return isToday && d.data().birthdayGiftYear !== today.year;
          })
          .map((d) => d.id);
        if (ids.length) {
          const couponId = await createMemberCoupon(snap.ref, { title: gift, days, memberIds: ids, timezone });
          const birthdayVars = { ...vars, regalo: gift, dias: days };
          await sendNotification(
            snap.id,
            {
              type: "promo",
              kind: "birthday",
              title: fillTemplate(settings.birthday.title, birthdayVars).slice(0, 65),
              body: fillTemplate(settings.birthday.message, birthdayVars).slice(0, 240),
              audience: "all",
              ctaLabel: "",
              ctaUrl: "",
              memberIds: ids,
              couponId,
            },
            origin
          );
          await markMembers(snap.ref, ids, { birthdayGiftYear: today.year });
        }
        result.birthday = ids.length;
      }

      if (settings.winback.enabled) {
        const cutoff = Date.now() - settings.winback.days * DAY;
        // Una vez por ausencia: si vuelve y se vuelve a ausentar, se le escribe otra vez.
        const ids = members.docs
          .filter((d) => {
            const m = d.data();
            const lastVisit = m.lastStampAt?.toMillis?.() ?? 0;
            const lastSent = m.winbackSentAt?.toMillis?.() ?? 0;
            return (m.totalVisits ?? 0) > 0 && lastVisit > 0 && lastVisit < cutoff && lastSent < lastVisit;
          })
          .map((d) => d.id);
        if (ids.length) {
          const { coupon, couponDays } = settings.winback;
          const couponId = coupon
            ? await createMemberCoupon(snap.ref, { title: coupon, days: couponDays, memberIds: ids, timezone })
            : undefined;
          await sendNotification(
            snap.id,
            {
              type: "promo",
              kind: "winback",
              title: fillTemplate(settings.winback.title, vars).slice(0, 65),
              body: fillTemplate(settings.winback.message, vars).slice(0, 240),
              audience: "all",
              ctaLabel: "",
              ctaUrl: "",
              memberIds: ids,
              ...(couponId ? { couponId } : {}),
            },
            origin
          );
          await markMembers(snap.ref, ids, { winbackSentAt: FieldValue.serverTimestamp() });
        }
        result.winback = ids.length;
      }
    } catch (e) {
      console.error("Automatizaciones", snap.id, e);
      result.error = true;
    }
    results.push(result);
  }
  return results;
}
