"use client";
import { useEffect, useRef } from "react";
import { useNvCopy } from "../lib/use-copy";

// Lienzo fijo detrás de toda la página. Three.js se descarga después de pintar la página
// (import dinámico) para que el texto aparezca de inmediato.
export default function Scene3D() {
  const ref = useRef<HTMLCanvasElement>(null);
  const card = useNvCopy().card;

  useEffect(() => {
    let dispose: (() => void) | undefined;
    let cancelled = false;
    const mobile = window.matchMedia("(max-width: 820px), (pointer: coarse)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    import("../lib/scene").then(({ createScene }) => {
      if (cancelled || !ref.current) return;
      const s = createScene(ref.current, { mobile, reduced, card });
      if (s) {
        dispose = s.dispose;
        ref.current.dataset.ready = "1";
      }
    });
    return () => {
      cancelled = true;
      dispose?.();
    };
  }, [card]);

  return <canvas ref={ref} className="nv-canvas" aria-hidden />;
}
