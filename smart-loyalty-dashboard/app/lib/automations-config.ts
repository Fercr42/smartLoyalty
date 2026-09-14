// Ajustes de las automatizaciones (companies/{id}.automations). Se usa en el navegador y en el servidor.
// Los textos aceptan {restaurante}, {premio}, {regalo} y {dias}.

export const AUTOMATIONS_RUN_HOUR = 10; // cumpleaños y "te extrañamos" se revisan desde las 10 am, hora del restaurante
export const NEAR_REWARD_DELAY_MIN = 30;

export const AUTOMATION_DEFAULTS = {
  nearReward: {
    enabled: false,
    title: "¡Te falta 1 sello!",
    message: "Te falta 1 sello para {premio}. ¡Te esperamos pronto!",
  },
  birthday: {
    enabled: false,
    gift: "Postre gratis",
    days: 7,
    title: "¡Feliz cumpleaños!",
    message: "En {restaurante} te tenemos un regalo: {regalo}. Válido por {dias} días.",
  },
  winback: {
    enabled: false,
    days: 30,
    title: "Te extrañamos",
    message: "Hace tiempo que no te vemos en {restaurante}. ¡Vuelve pronto!",
    coupon: "",
    couponDays: 7,
  },
};

export type Automations = typeof AUTOMATION_DEFAULTS;

const text = (v: unknown, fallback: string, max: number) =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : fallback;
const int = (v: unknown, fallback: number, min: number, max: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(Math.max(n, min), max) : fallback;
};

export function cleanAutomations(raw: unknown): Automations {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, Record<string, unknown> | undefined>;
  const d = AUTOMATION_DEFAULTS;
  return {
    nearReward: {
      enabled: Boolean(r.nearReward?.enabled),
      title: text(r.nearReward?.title, d.nearReward.title, 65),
      message: text(r.nearReward?.message, d.nearReward.message, 240),
    },
    birthday: {
      enabled: Boolean(r.birthday?.enabled),
      gift: text(r.birthday?.gift, d.birthday.gift, 60),
      days: int(r.birthday?.days, d.birthday.days, 1, 60),
      title: text(r.birthday?.title, d.birthday.title, 65),
      message: text(r.birthday?.message, d.birthday.message, 240),
    },
    winback: {
      enabled: Boolean(r.winback?.enabled),
      days: int(r.winback?.days, d.winback.days, 7, 365),
      title: text(r.winback?.title, d.winback.title, 65),
      message: text(r.winback?.message, d.winback.message, 240),
      coupon: typeof r.winback?.coupon === "string" ? r.winback.coupon.trim().slice(0, 60) : "",
      couponDays: int(r.winback?.couponDays, d.winback.couponDays, 1, 60),
    },
  };
}

export const fillTemplate = (template: string, vars: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (match, key) => (key in vars ? String(vars[key]) : match));
