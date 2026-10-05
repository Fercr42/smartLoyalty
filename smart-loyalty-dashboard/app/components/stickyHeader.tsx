"use client";
import { useEffect, useState, type ReactNode } from "react";

// La barra de arriba se achica y gana sombra al bajar por la página.
export default function StickyHeader({ children }: { children: ReactNode }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-30 border-b transition-all duration-300 ${
        scrolled
          ? "bg-white/95 backdrop-blur border-[#e6ece9] shadow-[0_10px_30px_-24px_rgba(7,32,27,0.8)]"
          : "bg-white/80 backdrop-blur border-transparent"
      }`}
    >
      <div className={`transition-all duration-300 ${scrolled ? "py-0" : "py-1"}`}>{children}</div>
    </header>
  );
}
