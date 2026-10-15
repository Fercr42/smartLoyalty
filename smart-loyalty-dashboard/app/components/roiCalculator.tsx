"use client";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "../i18n/client";
import { PLAN_PRICE_USD } from "../lib/plan";
import { roi } from "../lib/roi";

// El número del resultado viaja hasta su valor nuevo en lugar de saltar.
function useCountUp(value: number) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setShown(value);
      from.current = value;
      return;
    }
    const inicio = performance.now();
    const desde = from.current;
    let frame = requestAnimationFrame(function paso(ahora) {
      const t = Math.min((ahora - inicio) / 450, 1);
      const suave = 1 - Math.pow(1 - t, 3);
      setShown(Math.round(desde + (value - desde) * suave));
      if (t < 1) frame = requestAnimationFrame(paso);
      else from.current = value;
    });
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return shown;
}

// Gasto por visita según la moneda del idioma: colones, dólares o bahts.
const TICKET = {
  es: { min: 1000, max: 40000, step: 500, start: 6000 },
  en: { min: 2, max: 100, step: 1, start: 12 },
  th: { min: 30, max: 2000, step: 10, start: 150 },
} as const;

// Calculadora de la página principal: cuánta ganancia deja que algunos clientes vuelvan una vez más.
// Valores iniciales conservadores (5 % que vuelve, 30 % de ganancia). No promete resultados.
export default function RoiCalculator() {
  const { m, f, dateLocale, locale } = useI18n();
  const t = m.landing;
  const range = TICKET[locale] ?? TICKET.es;
  const [customers, setCustomers] = useState(150);
  const [ticket, setTicket] = useState<number>(range.start);
  const [returning, setReturning] = useState(5);
  const [margin, setMargin] = useState(30);

  // Si cambia el idioma, cambia la moneda: volver al gasto típico de esa moneda.
  const [ticketLocale, setTicketLocale] = useState(locale);
  if (ticketLocale !== locale) {
    setTicketLocale(locale);
    setTicket(range.start);
  }

  const rate = Number(t.roiRate) || 1;
  const planLocal = Math.round(PLAN_PRICE_USD * rate);
  const result = roi({ customers, ticket, returning, margin, planLocal });
  const animado = useCountUp(result.profit);
  const number = (value: number) => value.toLocaleString(dateLocale);
  const money = (value: number) => `${t.roiCurrency}${number(value)}`;

  const field = "w-full accent-[#19c58a]";
  const box = "sl-lift rounded-2xl border border-white/12 bg-white/5 p-5 flex flex-col gap-2";

  const slider = (
    id: string,
    label: string,
    shown: string,
    value: number,
    set: (v: number) => void,
    min: number,
    max: number,
    step: number
  ) => (
    <label htmlFor={id} className={box}>
      <span className="text-sm text-white/65">{label}</span>
      <span className="text-2xl font-extrabold tabular-nums">{shown}</span>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => set(Number(e.target.value))}
        className={field}
      />
    </label>
  );

  return (
    <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr] items-stretch">
      <div className="grid gap-4 sm:grid-cols-2">
        {slider("roi-customers", t.roiCustomers, number(customers), customers, setCustomers, 20, 1000, 10)}
        {slider("roi-ticket", f(t.roiTicket, { currency: t.roiCurrency }), money(ticket), ticket, setTicket, range.min, range.max, range.step)}
        {slider("roi-return", t.roiReturn, `${returning}`, returning, setReturning, 1, 20, 1)}
        {slider("roi-margin", t.roiMargin, `${margin}%`, margin, setMargin, 5, 70, 5)}
      </div>

      <div className="relative overflow-hidden rounded-3xl bg-[#0b352c] border border-[#19c58a]/30 text-white p-7 flex flex-col justify-center gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#f2b134]">{t.roiResult}</p>
        <p className="text-5xl sm:text-6xl font-extrabold tabular-nums leading-none">{money(animado)}</p>
        <p className="text-sm text-white/70">{f(t.roiSales, { visits: number(result.visits), sales: money(result.sales) })}</p>
        <p className={`text-sm font-semibold ${result.net >= 0 ? "text-[#9fe3cd]" : "text-[#f2b134]"}`}>
          {result.net >= 0 ? f(t.roiAfterPlan, { amount: money(result.net) }) : t.roiShort}
        </p>
        <p className="text-sm text-white/70">
          {f(t.roiCost, {
            price: PLAN_PRICE_USD,
            local: money(planLocal),
            count: Number.isFinite(result.breakEven) ? number(result.breakEven) : "—",
          })}
        </p>
        <p className="text-xs text-white/50">{t.roiNote}</p>
      </div>
    </div>
  );
}
