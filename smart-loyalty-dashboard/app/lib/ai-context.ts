import { z } from "zod";
import { validTimezone } from "./time";

// Formatos que devuelve la IA y la limpieza de sus respuestas. Sin dependencias de servidor:
// el panel importa los tipos desde aquí.

export const AI_DAILY_LIMIT = 20;

export const CampaignDraftSchema = z.object({
  name: z.string(),
  type: z.enum(["promo", "horario", "evento", "aviso"]),
  title: z.string(),
  body: z.string(),
  audience: z.enum(["all", "frequent", "inactive", "near_reward"]),
  coupon: z.object({ title: z.string(), days: z.number() }).nullable(),
  sendAt: z.string().nullable(),
  why: z.string(),
});
export const CampaignIdeasSchema = z.object({ drafts: z.array(CampaignDraftSchema) });
export type CampaignDraft = z.infer<typeof CampaignDraftSchema>;

export const FeedbackSummarySchema = z.object({
  summary: z.string(),
  positives: z.array(z.string()),
  problems: z.array(z.string()),
  actions: z.array(z.string()),
});
export type FeedbackSummary = z.infer<typeof FeedbackSummarySchema>;

const clip = (s: string, max: number) => {
  const t = s.trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
};

function localParts(timezone: string, date: Date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: validTimezone(timezone),
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value])
  );
  const weekday = new Intl.DateTimeFormat("es", { timeZone: validTimezone(timezone), weekday: "long" }).format(date);
  return { local: `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`, hour: Number(parts.hour), weekday };
}

// "lunes 2026-09-14T10:30" en la hora del restaurante.
export const localNow = (timezone: string, now = new Date()) => {
  const p = localParts(timezone, now);
  return { local: p.local, label: `${p.weekday} ${p.local.replace("T", " ")}` };
};

// Cuántas visitas (sellos) hubo por día de la semana y por hora, en la zona del restaurante.
export function visitPattern(timestamps: number[], timezone: string) {
  const byWeekday: Record<string, number> = {};
  const byHour: Record<string, number> = {};
  for (const ms of timestamps) {
    const p = localParts(timezone, new Date(ms));
    byWeekday[p.weekday] = (byWeekday[p.weekday] ?? 0) + 1;
    byHour[`${p.hour}h`] = (byHour[`${p.hour}h`] ?? 0) + 1;
  }
  return { total: timestamps.length, byWeekday, byHour };
}

// Recorta a los límites de las notificaciones y descarta fechas pasadas o mal escritas.
export function cleanDrafts(drafts: CampaignDraft[], nowLocal: string): CampaignDraft[] {
  return drafts.slice(0, 3).map((d) => ({
    ...d,
    name: clip(d.name, 40),
    title: clip(d.title, 65),
    body: clip(d.body, 240),
    why: clip(d.why, 200),
    coupon: d.coupon?.title.trim()
      ? { title: clip(d.coupon.title, 60), days: Math.min(60, Math.max(1, Math.round(d.coupon.days) || 7)) }
      : null,
    sendAt: d.sendAt && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(d.sendAt) && d.sendAt > nowLocal ? d.sendAt : null,
  }));
}

export function cleanSummary(s: FeedbackSummary): FeedbackSummary {
  const list = (items: string[]) => items.map((x) => clip(x, 200)).filter(Boolean).slice(0, 3);
  return { summary: clip(s.summary, 600), positives: list(s.positives), problems: list(s.problems), actions: list(s.actions) };
}
