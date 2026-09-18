import type { Messages } from "../i18n/messages";

// Ajustes de las automatizaciones (companies/{id}.automations). Se usa en el navegador y en el servidor.
// Los textos por defecto vienen del idioma del negocio (m.automations.defaults).

export const AUTOMATIONS_RUN_HOUR = 10; // cumpleaños y "te extrañamos" se revisan desde las 10 am, hora del negocio
export const NEAR_REWARD_DELAY_MIN = 30;

type DefaultTexts = Messages["automations"]["defaults"];

export function automationDefaults(d: DefaultTexts) {
  return {
    nearReward: { enabled: false, title: d.nearRewardTitle, message: d.nearRewardMessage },
    birthday: { enabled: false, gift: d.birthdayGift, days: 7, title: d.birthdayTitle, message: d.birthdayMessage },
    winback: { enabled: false, days: 30, title: d.winbackTitle, message: d.winbackMessage, coupon: "", couponDays: 7 },
  };
}

export type Automations = ReturnType<typeof automationDefaults>;

const text = (v: unknown, fallback: string, max: number) =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : fallback;
const int = (v: unknown, fallback: number, min: number, max: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(Math.max(n, min), max) : fallback;
};

export function cleanAutomations(raw: unknown, defaults: DefaultTexts): Automations {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, Record<string, unknown> | undefined>;
  const d = automationDefaults(defaults);
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

// Variables de los textos. Se aceptan en español y en inglés: {negocio} = {restaurante} = {business}, etc.
export type TemplateVars = { business?: string; reward?: string; gift?: string; days?: number };
const ALIASES: Record<string, keyof TemplateVars> = {
  business: "business",
  negocio: "business",
  restaurante: "business",
  reward: "reward",
  premio: "reward",
  gift: "gift",
  regalo: "gift",
  days: "days",
  dias: "days",
};

export const fillTemplate = (template: string, vars: TemplateVars) =>
  template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const name = ALIASES[key.toLowerCase()];
    const value = name ? vars[name] : undefined;
    return value === undefined ? match : String(value);
  });
