"use client";
import { useEffect, useRef } from "react";

// Barra fina arriba: muestra cuánto se lleva leído. Se nota igual en celular y en computadora.
export default function ScrollProgress() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    let pedido = 0;
    const pintar = () => {
      pedido = 0;
      const alto = document.documentElement.scrollHeight - window.innerHeight;
      const avance = alto > 0 ? Math.min(window.scrollY / alto, 1) : 0;
      node.style.transform = `scaleX(${avance})`;
    };
    const alMover = () => {
      if (pedido) return;
      pedido = requestAnimationFrame(pintar);
    };

    pintar();
    window.addEventListener("scroll", alMover, { passive: true });
    window.addEventListener("resize", alMover, { passive: true });
    return () => {
      if (pedido) cancelAnimationFrame(pedido);
      window.removeEventListener("scroll", alMover);
      window.removeEventListener("resize", alMover);
    };
  }, []);

  return <div ref={ref} className="sl-progress w-full" style={{ transform: "scaleX(0)" }} aria-hidden />;
}
