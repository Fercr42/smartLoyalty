"use client";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { intro } from "../lib/intro";
import { useNvCopy } from "../lib/use-copy";

// Intro de menos de 2 segundos: un contador de "visitas" llega a 100 y una cortina sube.
export default function Loader() {
  const root = useRef<HTMLDivElement>(null);
  const num = useRef<HTMLSpanElement>(null);
  const [gone, setGone] = useState(false);
  const t = useNvCopy().loader;

  useEffect(() => {
    intro.reset();
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      // Con movimiento reducido el CSS ya oculta la cortina; solo se avisa que empiece la página.
      intro.start();
      return;
    }
    const count = { v: 0 };
    const tl = gsap.timeline({ onComplete: () => setGone(true) });
    tl.to(count, {
      v: 100,
      duration: 1.15,
      ease: "power2.inOut",
      onUpdate: () => {
        if (num.current) num.current.textContent = String(Math.round(count.v)).padStart(3, "0");
      },
    })
      .to(".nv-loader-bar > i", { scaleX: 1, duration: 1.15, ease: "power2.inOut" }, 0)
      .add(() => intro.start(), "+=0.05")
      .to(root.current, { clipPath: "inset(0% 0% 100% 0%)", duration: 0.65, ease: "expo.inOut" }, "<");
    return () => {
      tl.kill();
    };
  }, []);

  if (gone) return null;
  return (
    <div ref={root} className="nv-loader" role="status" aria-label={t.aria}>
      <div className="nv-loader-inner">
        <span className="nv-loader-num" ref={num}>
          000
        </span>
        <span className="nv-loader-label">{t.label}</span>
        <span className="nv-loader-bar">
          <i />
        </span>
      </div>
    </div>
  );
}
