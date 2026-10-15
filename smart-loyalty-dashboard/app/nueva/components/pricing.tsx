"use client";
import { useState, type PointerEvent } from "react";
import Link from "next/link";
import { useI18n } from "../../i18n/client";
import { useNvCopy } from "../lib/use-copy";
import { ANNUAL_MONTHS, EXTRA_LOCAL, PLANS, TIERS, TRIAL_DAYS, type Period, type Tier } from "../../lib/plan";

// Precios reales de lib/plan, en el idioma del visitante. Las tarjetas se inclinan hacia el cursor y un brillo sigue al mouse.

function tilt(e: PointerEvent<HTMLElement>) {
  if (e.pointerType !== "mouse") return;
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width;
  const y = (e.clientY - r.top) / r.height;
  el.style.setProperty("--rx", `${(0.5 - y) * 8}deg`);
  el.style.setProperty("--ry", `${(x - 0.5) * 10}deg`);
  el.style.setProperty("--mx", `${x * 100}%`);
  el.style.setProperty("--my", `${y * 100}%`);
}
function untilt(e: PointerEvent<HTMLElement>) {
  e.currentTarget.style.setProperty("--rx", "0deg");
  e.currentTarget.style.setProperty("--ry", "0deg");
}

export default function Pricing() {
  const { locale } = useI18n();
  const c = useNvCopy();
  const t = c.pricing;
  const [period, setPeriod] = useState<Period>("month");
  const months = period === "year" ? ANNUAL_MONTHS : 1;
  // Español: colones (y dólares de referencia). Inglés y tailandés: dólares.
  const es = locale === "es";
  const price = (tier: Tier) => (es ? c.money(PLANS[tier].crc * months) : c.money(PLANS[tier].usd * months * 100));
  const extra = es ? c.money(EXTRA_LOCAL.crc) : c.money(EXTRA_LOCAL.usd * 100);

  return (
    <>
      <div className="nv-period" role="group" aria-label={t.periodLabel}>
        <button type="button" aria-pressed={period === "month"} onClick={() => setPeriod("month")}>
          {t.monthly}
        </button>
        <button type="button" aria-pressed={period === "year"} onClick={() => setPeriod("year")}>
          {t.annual}
        </button>
        <span className="nv-period-pill" data-on={period} aria-hidden />
      </div>

      <div className="nv-plans">
        {TIERS.map((tier) => {
          const featured = tier === "pro";
          return (
            <article key={tier} className={`nv-plan ${featured ? "is-featured" : ""}`} onPointerMove={tilt} onPointerLeave={untilt}>
              {featured && <p className="nv-plan-flag">{t.flag}</p>}
              <h3 className="nv-plan-name">{t.names[tier]}</h3>
              <p className="nv-plan-tag">{t.taglines[tier]}</p>
              <p className="nv-plan-price">
                <span key={period} className="nv-plan-amount">
                  {price(tier)}
                </span>
                <span className="nv-plan-per">{period === "year" ? t.perYear : t.perMonth}</span>
              </p>
              <p className="nv-plan-usd">{t.secondary(PLANS[tier].usd * months)}</p>
              <ul className="nv-plan-list">
                {t.features[tier].map((f) => (
                  <li key={f}>{f.replace("{extra}", `+${extra}`)}</li>
                ))}
              </ul>
              <Link href="/registro" className={`nv-btn ${featured ? "nv-btn-primary" : "nv-btn-dark"}`} data-cursor={c.nav.cursorStart}>
                {t.cta(TRIAL_DAYS)}
              </Link>
            </article>
          );
        })}
      </div>
    </>
  );
}
