"use client";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "../i18n/client";
import { LOYALTY_MODES, type LoyaltyMode } from "../lib/loyalty-mode";

// Selector vivo de la página principal: el visitante toca sellos, puntos o cashback
// y ve la tarjeta del cliente y lo que hace el empleado en cada caso.
// Mientras nadie lo toca, va cambiando solo para que se note que se puede jugar con él.
export default function ProgramShowcase() {
  const { m } = useI18n();
  const t = m.landing;
  const [mode, setMode] = useState<LoyaltyMode>("points");
  const [solo, setSolo] = useState(true);
  const caja = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!solo) return;
    const quieto = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (quieto || typeof IntersectionObserver === "undefined") return;

    let reloj: ReturnType<typeof setInterval> | null = null;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.some((e) => e.isIntersecting);
        if (visible && !reloj) {
          reloj = setInterval(() => {
            setMode((actual) => LOYALTY_MODES[(LOYALTY_MODES.indexOf(actual) + 1) % LOYALTY_MODES.length]);
          }, 3200);
        } else if (!visible && reloj) {
          clearInterval(reloj);
          reloj = null;
        }
      },
      { threshold: 0.35 }
    );
    if (caja.current) observer.observe(caja.current);
    return () => {
      if (reloj) clearInterval(reloj);
      observer.disconnect();
    };
  }, [solo]);

  const elegir = (option: LoyaltyMode) => {
    setSolo(false); // alguien tomó el control: deja de cambiar solo
    setMode(option);
  };

  const unit = m.pass.unit[mode];
  const value = mode === "stamps" ? "7" : mode === "points" ? "450" : "₡2.000";
  const goal = mode === "stamps" ? "10" : mode === "points" ? "500" : "₡3.000";
  const progress = mode === "stamps" ? 70 : mode === "points" ? 90 : 66;

  return (
    <div ref={caja} className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr] items-center">
      <div className="flex flex-col gap-3">
        {LOYALTY_MODES.map((option) => {
          const active = option === mode;
          return (
            <button
              key={option}
              type="button"
              onClick={() => elegir(option)}
              aria-pressed={active}
              className={`sl-tap text-left rounded-2xl border p-5 transition-all duration-300 ${
                active
                  ? "border-[#f2b134] bg-white/10 shadow-[0_18px_40px_-24px_rgba(242,177,52,0.8)] translate-x-1"
                  : "border-white/12 bg-white/5 hover:border-white/30"
              }`}
            >
              <span className="flex items-center gap-3">
                <span
                  className={`w-2.5 h-2.5 rounded-full shrink-0 ${active ? "bg-[#f2b134] sl-pulse" : "bg-white/30"}`}
                  aria-hidden
                />
                <span className="font-bold text-lg text-white">{m.rewards.modes[option].label}</span>
              </span>
              <span className="block text-sm text-white/65 mt-1 pl-[1.4rem]">{m.rewards.modes[option].hint}</span>
              <span
                className={`grid transition-all duration-300 ml-[1.4rem] ${
                  active ? "grid-rows-[1fr] opacity-100 mt-3" : "grid-rows-[0fr] opacity-0"
                }`}
              >
                <span className="overflow-hidden">
                  <span className="inline-flex items-center gap-2 rounded-lg bg-[#f2b134]/15 px-3 py-1.5 text-xs font-semibold text-[#ffd98a]">
                    {t.modesStaff[option]}
                  </span>
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Tarjeta del cliente, con los números del modo elegido. */}
      <div className="justify-self-center w-full max-w-[22rem]">
        <div
          key={mode}
          className="sl-rise rounded-[1.75rem] p-6 text-white shadow-2xl flex flex-col gap-5"
          style={{ background: "linear-gradient(150deg, #0e7c66 0%, #0a4a3e 60%, #06302a 100%)" }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-bold text-lg leading-tight">{t.heroCardBusiness}</p>
              <p className="text-xs text-white/70">{t.heroCardMember}</p>
            </div>
            <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide">
              {unit}
            </span>
          </div>

          <div className="flex flex-col items-center gap-3 py-2">
            <p className="text-5xl font-extrabold tabular-nums text-[#f2b134] leading-none">{value}</p>
            <div className="w-full h-2.5 rounded-full bg-white/20 overflow-hidden">
              <div className="h-full rounded-full bg-[#f2b134] transition-all duration-700" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-xs text-white/75 tabular-nums">
              {value} / {goal} · {t.modesReward}
            </p>
          </div>

          <div className="rounded-xl bg-white/10 p-3 text-xs text-white/85">{t.modesStaff[mode]}</div>
        </div>
      </div>
    </div>
  );
}
