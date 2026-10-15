"use client";
import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { SHAPE, stage, type CardTarget } from "../lib/stage";
import { intro } from "../lib/intro";
import { scramble } from "../lib/scramble";

// Coreografía de la página: scroll suave (Lenis), entradas del texto, la sección fija de
// "Suma / Avisa / Recomienda", el carrusel de rubros, los pasos en horizontal y los estados de la escena 3D.

type Scene = { shape: number; card: Partial<CardTarget>; fade: number };
const HIDDEN: Partial<CardTarget> = { x: 0, y: 0, s: 0 };

export default function Choreo() {
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mobile = window.matchMedia("(max-width: 820px)").matches;
    // La escena se acomoda según la orientación: en vertical la tarjeta va arriba del texto.
    const portrait = window.innerHeight > window.innerWidth;
    const root = document.querySelector<HTMLElement>("[data-nv]")!;
    const cleanups: (() => void)[] = [];

    // --- Estados de la escena 3D por sección --------------------------------
    const scenes: Record<string, Scene> = {
      hero: {
        shape: SHAPE.galaxy,
        card: portrait ? { x: 0, y: 1.55, z: 0, rx: -0.1, ry: -0.3, rz: 0.04, s: 0.92 } : { x: 2.1, y: 0.45, z: 0, rx: -0.12, ry: -0.42, rz: 0.06, s: 1 },
        fade: 1,
      },
      suma: { shape: SHAPE.stamps, card: portrait ? { x: 0, y: 1.7, z: 0, rx: 0, ry: 0, rz: 0, s: 1 } : { x: 2.7, y: 0.1, z: 0, rx: 0, ry: 0, rz: 0, s: 1 }, fade: 1 },
      avisa: { shape: SHAPE.rings, card: portrait ? { x: 0, y: 1.7, rx: -0.08, ry: 0.3, rz: 0, s: 0.9 } : { x: 2.7, y: 0.15, rx: -0.1, ry: 0.4, rz: 0.03, s: 1 }, fade: 1 },
      recomienda: { shape: SHAPE.star, card: portrait ? { x: 0, y: 1.7, rx: 0.05, ry: -0.25, rz: -0.05, s: 0.85 } : { x: 2.7, y: 0, rx: 0.08, ry: -0.3, rz: -0.06, s: 0.95 }, fade: 1 },
      sim: { shape: SHAPE.galaxy, card: HIDDEN, fade: 0.5 },
      numbers: { shape: SHAPE.galaxy, card: HIDDEN, fade: 0.75 },
      steps: { shape: SHAPE.galaxy, card: HIDDEN, fade: 0.45 },
      final: { shape: SHAPE.sphere, card: portrait ? HIDDEN : { x: 0, y: 0.2, z: -1.5, rx: 0.15, ry: 0, rz: 0, s: 0.5 }, fade: 0.8 },
      footer: { shape: SHAPE.sphere, card: HIDDEN, fade: 0.4 },
    };
    const apply = (name: string) => {
      const s = scenes[name];
      if (!s) return;
      stage.shape = s.shape;
      Object.assign(stage.card, s.card);
      stage.fade = s.fade;
    };
    apply("hero");

    // --- Scroll suave -------------------------------------------------------
    let lenis: Lenis | null = null;
    if (!reduced) {
      lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.95, touchMultiplier: 1.4 });
      lenis.on("scroll", ScrollTrigger.update);
      const tick = (t: number) => lenis!.raf(t * 1000);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);
      lenis.stop(); // hasta que termine la intro
      cleanups.push(() => {
        gsap.ticker.remove(tick);
        lenis?.destroy();
      });
    }

    // Enlaces internos (#precios…) con el mismo scroll suave.
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]');
      if (!a) return;
      const target = document.querySelector(a.getAttribute("href")!);
      if (!target) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(target as HTMLElement, { duration: 1.6 });
      else target.scrollIntoView();
    };
    root.addEventListener("click", onClick);
    cleanups.push(() => root.removeEventListener("click", onClick));

    // Cursor para la escena 3D.
    const onMove = (e: PointerEvent) => {
      stage.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      stage.mouse.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onMove);
    cleanups.push(() => window.removeEventListener("pointermove", onMove));

    // --- Intro: el título cae letra por letra y las partículas nacen del centro ----------
    const off = intro.on(() => {
      root.classList.add("is-ready");
      lenis?.start();
      if (reduced) {
        stage.intro = 1;
        return;
      }
      gsap.to(stage, { intro: 1, duration: 2.6, ease: "expo.out" });
    });
    cleanups.push(off);

    const ctx = gsap.context(() => {
      // HUD: número y nombre de la sección en pantalla.
      const hudNum = root.querySelector<HTMLElement>("[data-hud-num]");
      const hudName = root.querySelector<HTMLElement>("[data-hud-name]");
      const hudSections = gsap.utils.toArray<HTMLElement>("[data-hud]");
      hudSections.forEach((sec, i) => {
        ScrollTrigger.create({
          trigger: sec,
          start: "top 55%",
          end: "bottom 55%",
          onToggle: (self) => {
            if (!self.isActive) return;
            if (hudNum) hudNum.textContent = `${String(i + 1).padStart(2, "0")} / ${String(hudSections.length).padStart(2, "0")}`;
            if (hudName) scramble(hudName, sec.dataset.hud!, 500);
          },
        });
      });

      // Menú: se esconde al bajar y vuelve al subir.
      const nav = root.querySelector<HTMLElement>("[data-nav]");
      ScrollTrigger.create({
        start: 0,
        end: "max",
        onUpdate: (self) => nav?.classList.toggle("is-hidden", self.direction === 1 && self.scroll() > 240),
      });

      // Estados 3D de las secciones sencillas.
      gsap.utils.toArray<HTMLElement>("[data-scene]").forEach((sec) => {
        ScrollTrigger.create({
          trigger: sec,
          start: "top 60%",
          end: "bottom 40%",
          onToggle: (self) => self.isActive && apply(sec.dataset.scene!),
        });
      });

      // Precios tapa toda la pantalla con fondo claro: la escena 3D descansa mientras tanto.
      const pricing = root.querySelector<HTMLElement>("[data-opaque]");
      if (pricing) {
        ScrollTrigger.create({
          trigger: pricing,
          start: "top top",
          end: "bottom bottom",
          onToggle: (self) => (stage.paused = self.isActive),
        });
      }

      // Textos que se revelan por palabras al entrar en pantalla.
      ScrollTrigger.batch("[data-reveal]", {
        start: "top 88%",
        once: true,
        onEnter: (els) => els.forEach((el) => el.classList.add("is-in")),
      });

      // Cifras que cuentan.
      gsap.utils.toArray<HTMLElement>("[data-count]").forEach((el) => {
        const to = Number(el.dataset.count);
        const obj = { v: 0 };
        ScrollTrigger.create({
          trigger: el,
          start: "top 85%",
          once: true,
          onEnter: () =>
            gsap.to(obj, {
              v: to,
              duration: reduced ? 0 : 1.8,
              ease: "power3.out",
              onUpdate: () => (el.textContent = String(Math.round(obj.v))),
            }),
        });
      });

      // --- Suma / Avisa / Recomienda: sección fija con tres escenas ---------------
      const value = root.querySelector<HTMLElement>("[data-pin='value']");
      if (value) {
        const beats = gsap.utils.toArray<HTMLElement>("[data-beat]", value);
        const ticks = gsap.utils.toArray<HTMLElement>("[data-tick]", value);
        const names = ["suma", "avisa", "recomienda"];
        let current = -1;
        const mark = (b: number) => {
          beats.forEach((el, i) => el.classList.toggle("is-on", i === b));
          ticks.forEach((el, i) => el.classList.toggle("is-on", i <= b));
        };
        const show = (b: number) => {
          if (b === current) return;
          current = b;
          mark(b);
          apply(names[b]);
        };
        if (reduced) {
          // Sin animación: las tres escenas una debajo de otra, sin fijar la sección.
          value.classList.add("is-static");
          stage.stamps = 10;
          stage.points = 1240;
          ScrollTrigger.create({ trigger: value, start: "top 60%", end: "bottom 40%", onToggle: (s) => s.isActive && apply("suma") });
        } else {
          ScrollTrigger.create({
            trigger: value,
            start: "top top",
            end: () => `+=${window.innerHeight * (mobile ? 2.4 : 3)}`,
            pin: true,
            scrub: true,
            onUpdate: (self) => {
              const p = self.progress;
              show(p < 0.34 ? 0 : p < 0.67 ? 1 : 2);
              // Durante "Suma" los sellos se encienden uno a uno y los puntos suben.
              const lit = Math.min(10, Math.max(0, ((p - 0.03) / 0.27) * 10));
              stage.stamps = lit;
              stage.points = Math.round(lit) * 124;
              const bar = value.querySelector<HTMLElement>("[data-progress]");
              if (bar) bar.style.transform = `scaleY(${p})`;
            },
            onLeaveBack: () => apply("hero"),
          });
          mark(0); // texto listo, pero la escena sigue en el hero hasta llegar aquí
        }
      }

      // --- Rubros: carrusel infinito que acelera e inclina con la velocidad del scroll ------
      const track = root.querySelector<HTMLElement>("[data-marquee]");
      if (track && !reduced) {
        const loop = gsap.to(track, { xPercent: -50, duration: 38, ease: "none", repeat: -1 });
        const skewTo = gsap.quickTo(track, "skewX", { duration: 0.5, ease: "power3" });
        lenis?.on("scroll", ({ velocity }: { velocity: number }) => {
          const v = gsap.utils.clamp(-40, 40, velocity);
          loop.timeScale(1 + Math.abs(v) * 0.12);
          skewTo(gsap.utils.clamp(-10, 10, -v * 0.35));
        });
      }

      // --- Tres pasos en horizontal (computadora) -----------------------------
      const steps = root.querySelector<HTMLElement>("[data-hscroll]");
      const stepsTrack = steps?.querySelector<HTMLElement>("[data-htrack]");
      if (steps && stepsTrack && !mobile && !reduced) {
        const dist = () => stepsTrack.scrollWidth - window.innerWidth;
        const tween = gsap.to(stepsTrack, {
          x: () => -dist(),
          ease: "none",
          scrollTrigger: { trigger: steps, start: "top top", end: () => `+=${dist()}`, pin: true, scrub: 0.8, invalidateOnRefresh: true },
        });
        // Los números grandes se desplazan más lento que las tarjetas (paralaje dentro del scroll lateral).
        gsap.utils.toArray<HTMLElement>("[data-step-num]", steps).forEach((n) => {
          gsap.fromTo(n, { xPercent: 30 }, { xPercent: -30, ease: "none", scrollTrigger: { trigger: n, containerAnimation: tween, start: "left right", end: "right left", scrub: true } });
        });
      }

      // --- Cierre: el título sube con el scroll y la tarjeta gira dentro de la esfera ------
      const final = root.querySelector<HTMLElement>("[data-final]");
      if (final && !reduced) {
        gsap.fromTo(
          final.querySelectorAll(".nv-char"),
          { yPercent: 115, rotate: 8 },
          { yPercent: 0, rotate: 0, stagger: 0.012, ease: "power3.out", scrollTrigger: { trigger: final, start: "top 75%", end: "top 15%", scrub: 1 } },
        );
        ScrollTrigger.create({
          trigger: final,
          start: "top bottom",
          end: "bottom bottom",
          onUpdate: (self) => (stage.spin = self.progress * Math.PI * 2),
        });
      }

      // Partes que se desplazan a distinta velocidad (paralaje).
      if (!reduced) {
        gsap.utils.toArray<HTMLElement>("[data-speed]").forEach((el) => {
          const speed = Number(el.dataset.speed);
          gsap.fromTo(el, { y: () => 120 * speed }, { y: () => -120 * speed, ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true, invalidateOnRefresh: true } });
        });
      }
      // Los triggers se crearon fuera de orden respecto a las secciones fijadas: se ordenan y recalculan.
      ScrollTrigger.sort();
      ScrollTrigger.refresh();
    }, root);
    cleanups.push(() => ctx.revert());

    // Cuando cargan las fuentes cambian las medidas.
    document.fonts?.ready.then(() => ScrollTrigger.refresh()).catch(() => {});

    return () => cleanups.forEach((c) => c());
  }, []);

  return null;
}
