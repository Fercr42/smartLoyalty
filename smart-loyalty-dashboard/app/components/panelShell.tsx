"use client";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { BrandMark } from "./brandLogo";
import PanelIcon from "./panelIcons";
import { LanguageSwitcher } from "../i18n/client";
import { display } from "../fonts";
import { burst, burstFrom, confettiPop, confettiRain } from "../lib/fun";

// Marco del panel del dueño: barra lateral verde bosque (computadora) o franja superior (celular),
// con un indicador menta que se desliza a la sección activa. Lleva varias animaciones divertidas:
// íconos con movimiento propio, chispas al elegir sección, título que cae letra por letra,
// luciérnagas en la barra, confeti al entrar a Recompensas y una sorpresa al tocar el logo 5 veces.

type Tab = { id: string; label: string };
type Box = { top: number; left: number; width: number; height: number };

export default function PanelShell({
  tabs,
  active,
  onSelect,
  title,
  description,
  companyName,
  email,
  logoutLabel,
  onLogout,
  sectionsLabel,
  extra,
  banners,
  children,
}: {
  tabs: Tab[];
  active: string;
  onSelect: (id: string) => void;
  title: string;
  description: string;
  companyName: string;
  email: string;
  logoutLabel: string;
  onLogout: () => void;
  sectionsLabel: string;
  extra?: ReactNode;
  banners?: ReactNode;
  children: ReactNode;
}) {
  const titleRef = useRef<HTMLHeadingElement>(null);

  // Recompensas se celebra con confeti saliendo del título.
  useEffect(() => {
    if (active !== "recompensas") return;
    // Las letras del título, no todo el ancho de la línea.
    const id = window.setTimeout(() => confettiPop(titleRef.current?.firstElementChild ?? null), 450);
    return () => window.clearTimeout(id);
  }, [active]);

  const nav = <NavList tabs={tabs} active={active} onSelect={onSelect} label={sectionsLabel} />;

  const account = (
    <div className="flex items-center gap-2">
      <LanguageSwitcher className="bg-transparent text-white/80 border-white/20 [&>option]:text-gray-900" />
      {extra}
      <button
        onClick={onLogout}
        className="pn-bye text-sm whitespace-nowrap rounded-lg px-3 py-1.5 text-white/80 border border-white/20 hover:bg-white/10 hover:text-white transition-colors"
      >
        {logoutLabel}
      </button>
    </div>
  );

  const brand = (
    <div className="flex items-center gap-3 min-w-0">
      <SecretMark />
      <div className="min-w-0">
        <p className={`${display.className} text-white text-[15px] font-semibold leading-tight truncate`}>{companyName || "Smart Loyalty"}</p>
        <p className="text-[11px] text-white/50 truncate">Smart Loyalty</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f3f7f5] lg:grid lg:grid-cols-[264px_minmax(0,1fr)]">
      {/* Computadora: barra lateral fija. */}
      <aside className="pn-rail hidden lg:flex lg:flex-col lg:sticky lg:top-0 lg:h-screen p-5 gap-8">
        <Fireflies />
        {brand}
        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar -mx-1 px-1">{nav}</div>
        <div className="flex flex-col gap-3 border-t border-white/10 pt-4">
          <p className="text-xs text-white/50 truncate">{email}</p>
          {account}
        </div>
      </aside>

      {/* Celular: barra superior con las secciones deslizables. */}
      <header className="pn-rail lg:hidden sticky top-0 z-20 px-4 pt-3 pb-2 flex flex-col gap-3">
        <Fireflies few />
        <div className="flex items-center justify-between gap-3">
          {brand}
          {account}
        </div>
        {nav}
      </header>

      <div className="min-w-0 px-4 sm:px-8 py-7 lg:py-10">
        <div className="max-w-5xl mx-auto flex flex-col gap-6">
          {banners}
          <div key={`title-${active}`}>
            <h1
              ref={titleRef}
              aria-label={title}
              className={`${display.className} text-[2rem] sm:text-[2.6rem] font-extrabold leading-[1.05] tracking-tight text-[#07201b]`}
            >
              <BouncyText text={title} />
              {active === "inicio" && (
                <span aria-hidden className="pn-hand ml-3 inline-block">
                  👋
                </span>
              )}
            </h1>
            <span aria-hidden className="pn-underline block mt-3 h-1 w-14 rounded-full bg-[#19c58a]" />
            <p className="pn-desc text-[15px] text-[#4b5b55] mt-3 max-w-2xl">{description}</p>
          </div>
          <main key={active} className="pn-section flex flex-col gap-6 min-w-0">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

// Título que cae letra por letra con rebote; cada letra salta al pasarle el mouse.
function BouncyText({ text }: { text: string }) {
  let n = 0;
  return (
    <span aria-hidden>
      {text.split(" ").map((word, w) => (
        <span key={w} className="inline-block whitespace-nowrap">
          {[...word].map((ch, i) => (
            <span key={i} className="pn-letter" style={{ animationDelay: `${0.03 * n++}s` }}>
              {ch}
            </span>
          ))}
          {w < text.split(" ").length - 1 && <span className="inline-block w-[0.28em]" />}
        </span>
      ))}
    </span>
  );
}

// Logo que flota; al tocarlo saltan chispas y a la 5.ª vez seguida cae confeti por toda la pantalla.
function SecretMark() {
  const taps = useRef<number[]>([]);
  const [spin, setSpin] = useState(0);
  const onTap = (e: MouseEvent<HTMLButtonElement>) => {
    const now = Date.now();
    taps.current = [...taps.current.filter((t) => now - t < 2500), now];
    burst(e.clientX || e.currentTarget.getBoundingClientRect().left + 20, e.clientY || 40, { count: 10, spread: 50 });
    if (taps.current.length >= 5) {
      taps.current = [];
      setSpin((s) => s + 1);
      confettiRain();
    }
  };
  return (
    <button
      type="button"
      onClick={onTap}
      aria-label="Smart Loyalty"
      className="pn-mark grid place-items-center h-10 w-10 shrink-0 rounded-xl bg-white/95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#19c58a]"
    >
      <span key={spin} className={spin ? "pn-spin grid place-items-center" : "grid place-items-center"}>
        <BrandMark size={22} />
      </span>
    </button>
  );
}

// Lucecitas menta y doradas que suben despacio por la barra.
const FLIES = [
  { x: 8, d: 0, t: 11, s: 5, star: false },
  { x: 22, d: 3.5, t: 14, s: 4, star: true },
  { x: 35, d: 7, t: 12, s: 6, star: false },
  { x: 48, d: 1.5, t: 16, s: 3, star: false },
  { x: 60, d: 9, t: 13, s: 7, star: true },
  { x: 72, d: 5, t: 15, s: 4, star: false },
  { x: 84, d: 2.5, t: 12, s: 5, star: false },
  { x: 92, d: 11, t: 17, s: 6, star: true },
  { x: 15, d: 13, t: 14, s: 4, star: false },
  { x: 55, d: 15, t: 12, s: 5, star: false },
  { x: 40, d: 18, t: 16, s: 6, star: true },
  { x: 78, d: 20, t: 13, s: 3, star: false },
];

function Fireflies({ few = false }: { few?: boolean }) {
  return (
    <span aria-hidden className="pn-flies">
      {(few ? FLIES.slice(0, 6) : FLIES).map((f, i) => (
        <span
          key={i}
          className={f.star ? "pn-fly pn-star" : "pn-fly"}
          style={{
            left: `${f.x}%`,
            width: f.s,
            height: f.s,
            background: f.star ? "#f2b134" : "#19c58a",
            color: f.star ? "#f2b134" : "#19c58a",
            animationDelay: `${f.d}s`,
            animationDuration: `${f.t}s`,
            ["--dx" as string]: `${(i % 2 ? 1 : -1) * (10 + i * 2)}px`,
          }}
        />
      ))}
    </span>
  );
}

// Lista de secciones con su propio indicador (hay una en la barra lateral y otra en la franja del celular;
// cada una mide sus propios botones, porque la que está oculta mide cero).
function NavList({ tabs, active, onSelect, label }: { tabs: Tab[]; active: string; onSelect: (id: string) => void; label: string }) {
  const listRef = useRef<HTMLUListElement>(null);
  const [box, setBox] = useState<Box | null>(null);

  const measure = useCallback(() => {
    // Se mide el <li> (su referencia es la lista); el botón se mediría contra su propio <li>.
    const button = listRef.current?.querySelector<HTMLElement>(`[data-tab="${active}"]`)?.parentElement;
    if (!button || !button.offsetWidth) return;
    setBox({ top: button.offsetTop, left: button.offsetLeft, width: button.offsetWidth, height: button.offsetHeight });
    // En celular la franja se desliza de lado: centra la sección activa (sin mover la página).
    const list = listRef.current!;
    if (list.scrollWidth > list.clientWidth) {
      list.scrollTo({ left: button.offsetLeft - (list.clientWidth - button.offsetWidth) / 2, behavior: "smooth" });
    }
  }, [active]);

  // Medir el diseño ya pintado es justo el caso de useLayoutEffect.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useLayoutEffect(measure, [measure]);
  useEffect(() => {
    window.addEventListener("resize", measure);
    document.fonts?.ready.then(measure).catch(() => {});
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  const choose = (e: MouseEvent<HTMLButtonElement>, id: string) => {
    // Chispas desde donde se tocó (con teclado, desde el centro del botón).
    if (e.clientX || e.clientY) burst(e.clientX, e.clientY);
    else burstFrom(e.currentTarget);
    onSelect(id);
  };

  return (
    <nav aria-label={label} className="min-w-0">
      <ul ref={listRef} className="relative flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible no-scrollbar px-1 -mx-1 py-1">
        {box && (
          <li aria-hidden className="pn-indicator" style={box}>
            <span key={active} className="pn-blob" />
          </li>
        )}
        {tabs.map((t, i) => {
          const on = t.id === active;
          return (
            <li key={t.id} className="pn-item relative shrink-0" style={{ animationDelay: `${0.05 + i * 0.05}s` }}>
              <button
                data-tab={t.id}
                onClick={(e) => choose(e, t.id)}
                aria-current={on ? "page" : undefined}
                className={`pn-tab relative z-10 w-full flex items-center gap-2.5 whitespace-nowrap rounded-[0.85rem] px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#19c58a] ${
                  on ? "text-[#07201b]" : "text-white/70 hover:text-white hover:bg-white/[0.06]"
                }`}
              >
                <span className={`pn-ico pn-ico-${t.id}`}>
                  <PanelIcon name={t.id} />
                </span>
                <span className="pn-label">{t.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
