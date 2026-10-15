"use client";
import { useI18n } from "../i18n/client";
import { formatColones } from "../lib/format-money";
import { ANNUAL_MONTHS, EXTRA_LOCAL, PLANS, TIERS, type Period, type Tier } from "../lib/plan";

// Los tres planes en tarjetas. En el panel se pueden elegir (onSelect); en la página principal solo se muestran.
// Colones en español (Costa Rica), dólares en los otros idiomas.
export default function PlanCards({
  period,
  selected,
  onSelect,
  dark = false,
}: {
  period: Period;
  selected?: Tier;
  onSelect?: (tier: Tier) => void;
  dark?: boolean;
}) {
  const { m, f, locale } = useI18n();
  const t = m.plansInfo;
  const months = period === "year" ? ANNUAL_MONTHS : 1;
  const price = (tier: Tier) =>
    locale === "es" ? formatColones(PLANS[tier].crc * months) : `US$${PLANS[tier].usd * months}`;
  const secondary = (tier: Tier) => (locale === "es" ? `US$${PLANS[tier].usd * months}` : "");
  const extra = locale === "es" ? formatColones(EXTRA_LOCAL.crc) : `US$${EXTRA_LOCAL.usd}`;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {TIERS.map((tier) => {
        const recommended = tier === "pro";
        const active = selected === tier;
        const Tag = onSelect ? "button" : "div";
        return (
          <Tag
            key={tier}
            {...(onSelect ? { type: "button" as const, onClick: () => onSelect(tier), "aria-pressed": active } : {})}
            className={`relative text-left rounded-2xl border p-5 flex flex-col gap-3 transition-colors ${
              dark
                ? `${recommended ? "border-[#19c58a] bg-[#0b352c]" : "border-white/12 bg-white/5"} text-white`
                : `${active ? "border-[#0e7c66] ring-2 ring-[#0e7c66]/30 bg-[#f2faf7]" : "border-gray-200 bg-white hover:border-gray-300"}`
            }`}
          >
            {recommended && (
              <span className="absolute -top-2.5 right-4 rounded-full bg-[#f2b134] text-[#111418] text-[11px] font-bold px-2.5 py-0.5">
                {t.recommended}
              </span>
            )}
            <div>
              <p className="font-bold text-lg">{t.names[tier]}</p>
              <p className={`text-sm ${dark ? "text-white/65" : "text-gray-600"}`}>{t.taglines[tier]}</p>
            </div>
            <p className="tabular-nums">
              <span className="text-3xl font-extrabold">{price(tier)}</span>{" "}
              <span className={`text-sm ${dark ? "text-white/65" : "text-gray-600"}`}>
                {period === "year" ? t.perYear : t.perMonth}
              </span>
              {secondary(tier) && (
                <span className={`block text-xs ${dark ? "text-white/50" : "text-gray-500"}`}>{secondary(tier)}</span>
              )}
            </p>
            <ul className={`text-sm flex flex-col gap-1.5 ${dark ? "text-white/80" : "text-gray-700"}`}>
              {t.features[tier].map((feature) => (
                <li key={feature} className="flex gap-2">
                  <span aria-hidden className="text-[#19c58a]">✓</span>
                  <span>{f(feature, { price: extra })}</span>
                </li>
              ))}
            </ul>
          </Tag>
        );
      })}
    </div>
  );
}
