"use client";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { BrandMark } from "./brandLogo";
import PanelIcon from "./panelIcons";
import { LanguageSwitcher } from "../i18n/client";
import { display } from "../fonts";

// Marco del panel del dueño: barra lateral verde bosque (computadora) o franja superior (celular),
// con un indicador menta que se desliza a la sección activa. El contenido entra animado al cambiar de sección.

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
  const nav = <NavList tabs={tabs} active={active} onSelect={onSelect} label={sectionsLabel} />;

  const account = (
    <div className="flex items-center gap-2">
      <LanguageSwitcher className="bg-transparent text-white/80 border-white/20 [&>option]:text-gray-900" />
      {extra}
      <button
        onClick={onLogout}
        className="text-sm whitespace-nowrap rounded-lg px-3 py-1.5 text-white/80 border border-white/20 hover:bg-white/10 hover:text-white transition-colors"
      >
        {logoutLabel}
      </button>
    </div>
  );

  const brand = (
    <div className="flex items-center gap-3 min-w-0">
      <span className="grid place-items-center h-10 w-10 shrink-0 rounded-xl bg-white/95">
        <BrandMark size={22} />
      </span>
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
        {brand}
        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar -mx-1 px-1">{nav}</div>
        <div className="flex flex-col gap-3 border-t border-white/10 pt-4">
          <p className="text-xs text-white/50 truncate">{email}</p>
          {account}
        </div>
      </aside>

      {/* Celular: barra superior con las secciones deslizables. */}
      <header className="pn-rail lg:hidden sticky top-0 z-20 px-4 pt-3 pb-2 flex flex-col gap-3">
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
            <h1 className={`${display.className} text-[2rem] sm:text-[2.6rem] font-extrabold leading-[1.05] tracking-tight text-[#07201b]`}>
              {title}
            </h1>
            <span aria-hidden className="pn-underline block mt-3 h-1 w-14 rounded-full bg-[#19c58a]" />
            <p className="text-[15px] text-[#4b5b55] mt-3 max-w-2xl">{description}</p>
          </div>
          <main key={active} className="pn-section flex flex-col gap-6 min-w-0">
            {children}
          </main>
        </div>
      </div>
    </div>
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

  return (
    <nav aria-label={label} className="min-w-0">
      <ul ref={listRef} className="relative flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible no-scrollbar px-1 -mx-1 py-1">
        {box && <li aria-hidden className="pn-indicator" style={box} />}
        {tabs.map((t, i) => {
          const on = t.id === active;
          return (
            <li key={t.id} className="pn-item relative shrink-0" style={{ animationDelay: `${0.05 + i * 0.04}s` }}>
              <button
                data-tab={t.id}
                onClick={() => onSelect(t.id)}
                aria-current={on ? "page" : undefined}
                className={`relative z-10 w-full flex items-center gap-2.5 whitespace-nowrap rounded-[0.85rem] px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#19c58a] ${
                  on ? "text-[#07201b]" : "text-white/70 hover:text-white hover:bg-white/[0.06]"
                }`}
              >
                <PanelIcon name={t.id} />
                {t.label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
