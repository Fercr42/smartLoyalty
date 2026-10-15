// Recompensas por puntos (el campo stamps guarda la meta de puntos).
// Se usa en el navegador y en el servidor.

export type Reward = { id: string; title: string; stamps: number };

export const MAX_REWARDS = 5;

export function cleanRewards(raw: unknown): Reward[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((r, i) => ({
      id: typeof r?.id === "string" && r.id ? r.id.slice(0, 40) : `r${i}`,
      title: typeof r?.title === "string" ? r.title.trim().slice(0, 40) : "",
      stamps: Math.round(Number(r?.stamps)),
    }))
    .filter((r) => r.title && Number.isFinite(r.stamps) && r.stamps >= 1 && r.stamps <= 1_000_000)
    .slice(0, MAX_REWARDS)
    .sort((a, b) => a.stamps - b.stamps);
}

const LOCALES: Record<string, string> = { es: "es-ES", en: "en-US", th: "th-TH" };

// Puntos con separador de miles: 5000 -> 5.000
export const formatPoints = (value: number, locale = "es") => value.toLocaleString(LOCALES[locale] ?? "es-ES");

type RewardLabels = { ready: string; next: string };
const fill = (text: string, vars: Record<string, string | number>) => text.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));

// Texto del próximo premio en el idioma dado (m.rewardText).
export function nextRewardText(rewards: Reward[], stamps: number, t: RewardLabels, locale = "es") {
  const ready = rewards.filter((r) => r.stamps <= stamps);
  if (ready.length) return fill(t.ready, { reward: ready[ready.length - 1].title });
  const next = rewards.find((r) => r.stamps > stamps);
  return next ? fill(t.next, { reward: next.title, count: formatPoints(next.stamps - stamps, locale) }) : "";
}

// Cuántos minutos después de la compra se pide la reseña. Antes se guardaba en horas (delayHours).
export const REVIEW_DELAY_DEFAULT_MIN = 2;
export function reviewDelayMinutes(reviews?: { delayMinutes?: unknown; delayHours?: unknown } | null) {
  const minutes = Number(reviews?.delayMinutes);
  const hours = Number(reviews?.delayHours);
  const value = Number.isFinite(minutes) && minutes > 0 ? minutes : Number.isFinite(hours) && hours > 0 ? hours * 60 : REVIEW_DELAY_DEFAULT_MIN;
  return Math.min(Math.max(Math.round(value), 2), 48 * 60);
}
