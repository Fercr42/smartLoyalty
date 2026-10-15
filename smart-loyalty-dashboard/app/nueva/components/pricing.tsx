"use client";
import { useState, type PointerEvent } from "react";
import Link from "next/link";
import { formatColones } from "../../lib/format-money";
import { ANNUAL_MONTHS, EXTRA_LOCAL, PLANS, TIERS, TRIAL_DAYS, type Period, type Tier } from "../../lib/plan";

// Precios reales de lib/plan. Las tarjetas se inclinan hacia el cursor y un brillo sigue al mouse.

const INFO: Record<Tier, { name: string; tagline: string; features: string[] }> = {
  esencial: {
    name: "Esencial",
    tagline: "Para empezar con un local",
    features: [
      "Tarjeta en Google Wallet (Apple Wallet, próximamente)",
      "Escáner con PIN para tus empleados",
      "4 campañas de notificaciones al mes",
      "Aviso automático “ya casi lo logras”",
      "Estadísticas de visitas",
    ],
  },
  pro: {
    name: "Pro",
    tagline: "Todo para que vuelvan más",
    features: [
      "Todo lo de Esencial",
      "Notificaciones sin límite, programadas y por grupo",
      "Cumpleaños y “te extrañamos” con cupón",
      "Reseñas en Google después de la visita",
      "Cupones de un solo uso e inteligencia artificial",
    ],
  },
  multi: {
    name: "Multi-local",
    tagline: "Para 2 o 3 locales",
    features: ["Todo lo de Pro", "Hasta 3 locales (una cuenta por local)", `+${formatColones(EXTRA_LOCAL.crc)} por cada local extra`, "Soporte prioritario"],
  },
};

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
  const [period, setPeriod] = useState<Period>("month");
  const months = period === "year" ? ANNUAL_MONTHS : 1;

  return (
    <>
      <div className="nv-period" role="group" aria-label="Forma de pago">
        <button type="button" aria-pressed={period === "month"} onClick={() => setPeriod("month")}>
          Mensual
        </button>
        <button type="button" aria-pressed={period === "year"} onClick={() => setPeriod("year")}>
          Anual, 2 meses gratis
        </button>
        <span className="nv-period-pill" data-on={period} aria-hidden />
      </div>

      <div className="nv-plans">
        {TIERS.map((tier) => {
          const p = PLANS[tier];
          const info = INFO[tier];
          const featured = tier === "pro";
          return (
            <article key={tier} className={`nv-plan ${featured ? "is-featured" : ""}`} onPointerMove={tilt} onPointerLeave={untilt}>
              {featured && <p className="nv-plan-flag">Recomendado</p>}
              <h3 className="nv-plan-name">{info.name}</h3>
              <p className="nv-plan-tag">{info.tagline}</p>
              <p className="nv-plan-price">
                <span key={period} className="nv-plan-amount">
                  {formatColones(p.crc * months)}
                </span>
                <span className="nv-plan-per">{period === "year" ? "al año" : "al mes"}</span>
              </p>
              <p className="nv-plan-usd">US${p.usd * months}, sin IVA</p>
              <ul className="nv-plan-list">
                {info.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <Link href="/registro" className={`nv-btn ${featured ? "nv-btn-primary" : "nv-btn-dark"}`} data-cursor="Empezar">
                Probar {TRIAL_DAYS} días gratis
              </Link>
            </article>
          );
        })}
      </div>
    </>
  );
}
