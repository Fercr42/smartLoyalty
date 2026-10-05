"use client";
import { useEffect, useRef, type ReactNode } from "react";

// Las tarjetas del héroe siguen apenas al mouse. Solo en pantallas grandes con
// mouse, y nunca si el visitante pidió menos movimiento.
export default function HeroParallax({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    const quieto = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const conMouse = window.matchMedia?.("(hover: hover) and (min-width: 1024px)").matches;
    if (!node || quieto || !conMouse) return;

    let frame = 0;
    const onMove = (e: PointerEvent) => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const x = (e.clientX / window.innerWidth - 0.5) * 2; // -1 a 1
        const y = (e.clientY / window.innerHeight - 0.5) * 2;
        node.style.setProperty("--sl-x", `${(x * 10).toFixed(2)}px`);
        node.style.setProperty("--sl-y", `${(y * 8).toFixed(2)}px`);
      });
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={ref} className="sl-parallax">
      {children}
    </div>
  );
}
