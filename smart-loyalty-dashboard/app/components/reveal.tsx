"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";

// Aparición al hacer scroll. Si no hay JavaScript o el visitante pidió menos
// movimiento, el contenido se ve igual: la animación solo se enciende al montar.
export default function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"off" | "hidden" | "shown">("off");

  useEffect(() => {
    const node = ref.current;
    const quieto = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (!node || quieto || typeof IntersectionObserver === "undefined") return;

    let frame = 0;
    const mostrar = () => {
      setState("shown");
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
    // Basta con que haya llegado a la pantalla, o que ya haya quedado arriba
    // (pasa cuando alguien salta con un enlace del menú y se brinca la sección).
    const yaLlego = () => node.getBoundingClientRect().top < window.innerHeight * 0.88;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (yaLlego()) mostrar();
      });
    };

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) mostrar();
    });

    // Se mide cuando la página ya acomodó fuentes e imágenes: lo que quedó a la
    // vista no se esconde, para que no parpadee al cargar.
    const id = setTimeout(() => {
      if (yaLlego()) return;
      setState("hidden");
      observer.observe(node);
      window.addEventListener("scroll", onScroll, { passive: true });
    }, 150);

    return () => {
      clearTimeout(id);
      if (frame) cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <div
      ref={ref}
      className={`${className} ${state === "hidden" ? "sl-reveal-hidden" : state === "shown" ? "sl-reveal-shown" : ""}`}
      style={state === "shown" && delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
