"use client";
import { useState } from "react";
import { useI18n } from "../i18n/client";
import { PLAN_PRICE_USD } from "../lib/plan";

// Calculadora de la página principal: cuánto deja que una parte de los clientes vuelva una vez más.
// Son los números que escribe el dueño; no promete resultados.
const WEEKS_PER_MONTH = 4.3;

export default function RoiCalculator() {
  const { m, f, dateLocale } = useI18n();
  const t = m.landing;
  const [customers, setCustomers] = useState(200);
  const [ticket, setTicket] = useState(8000);
  const [returning, setReturning] = useState(10);

  const extra = Math.round(customers * WEEKS_PER_MONTH * (returning / 100) * ticket);
  const number = (value: number) => value.toLocaleString(dateLocale);

  const field = "w-full accent-[#0e7c66]";
  const box = "rounded-2xl border border-[#e6ece9] bg-white p-5 flex flex-col gap-2";

  return (
    <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr] items-stretch">
      <div className="flex flex-col gap-4">
        <label htmlFor="roi-customers" className={box}>
          <span className="text-sm text-[#4b5560]">{t.roiCustomers}</span>
          <span className="text-2xl font-extrabold tabular-nums">{number(customers)}</span>
          <input
            id="roi-customers"
            type="range"
            min={20}
            max={2000}
            step={10}
            value={customers}
            onChange={(e) => setCustomers(Number(e.target.value))}
            className={field}
          />
        </label>

        <label htmlFor="roi-ticket" className={box}>
          <span className="text-sm text-[#4b5560]">{t.roiTicket}</span>
          <span className="text-2xl font-extrabold tabular-nums">{number(ticket)}</span>
          <input
            id="roi-ticket"
            type="range"
            min={500}
            max={60000}
            step={500}
            value={ticket}
            onChange={(e) => setTicket(Number(e.target.value))}
            className={field}
          />
        </label>

        <label htmlFor="roi-return" className={box}>
          <span className="text-sm text-[#4b5560]">{t.roiReturn}</span>
          <span className="text-2xl font-extrabold tabular-nums">{returning}</span>
          <input
            id="roi-return"
            type="range"
            min={1}
            max={40}
            step={1}
            value={returning}
            onChange={(e) => setReturning(Number(e.target.value))}
            className={field}
          />
        </label>
      </div>

      <div className="rounded-3xl bg-[#111418] text-white p-7 flex flex-col justify-center gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#f2b134]">{t.roiResult}</p>
        <p className="text-5xl sm:text-6xl font-extrabold tabular-nums leading-none">{number(extra)}</p>
        <p className="text-sm text-white/70">{t.roiNote}</p>
        <p className="text-sm text-white/70">{f(t.roiCost, { price: PLAN_PRICE_USD })}</p>
      </div>
    </div>
  );
}
