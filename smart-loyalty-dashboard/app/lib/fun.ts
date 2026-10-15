// Efectos divertidos del panel: chispas al hacer clic y lluvia de confeti.
// Se crean como elementos sueltos en una capa fija que no recibe clics, y se borran solos al terminar.
// Si la persona pidió "reducir movimiento" en su teléfono o computadora, no se muestra nada.

const COLORS = ["#19c58a", "#f2b134", "#ffffff", "#7ee0bb", "#ff8a65", "#ffd66b"];

const reduceMotion = () =>
  typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function layer() {
  let el = document.getElementById("pn-fx");
  if (!el) {
    el = document.createElement("div");
    el.id = "pn-fx";
    el.className = "pn-fx";
    el.setAttribute("aria-hidden", "true");
    document.body.appendChild(el);
  }
  return el;
}

const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];

// Chispas que salen en círculo desde un punto (x, y de la pantalla).
export function burst(x: number, y: number, { count = 14, spread = 70, size = 1 }: { count?: number; spread?: number; size?: number } = {}) {
  if (reduceMotion()) return;
  const fx = layer();
  for (let i = 0; i < count; i++) {
    const s = document.createElement("span");
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
    const dist = spread * (0.55 + Math.random() * 0.7);
    s.className = i % 3 === 0 ? "pn-spark pn-star" : "pn-spark";
    s.style.left = `${x}px`;
    s.style.top = `${y}px`;
    s.style.background = pick(COLORS);
    s.style.setProperty("--s", `${(5 + Math.random() * 7) * size}px`);
    s.style.setProperty("--dx", `${Math.cos(angle) * dist}px`);
    s.style.setProperty("--dy", `${Math.sin(angle) * dist}px`);
    s.style.setProperty("--rot", `${Math.random() * 540 - 270}deg`);
    s.addEventListener("animationend", () => s.remove());
    fx.appendChild(s);
  }
}

// Chispas desde el centro de un elemento.
export function burstFrom(el: Element | null, options?: { count?: number; spread?: number; size?: number }) {
  if (!el) return;
  const r = el.getBoundingClientRect();
  burst(r.left + r.width / 2, r.top + r.height / 2, options);
}

// Lluvia de confeti por toda la pantalla.
export function confettiRain(count = 90) {
  if (reduceMotion()) return;
  const fx = layer();
  for (let i = 0; i < count; i++) {
    const c = document.createElement("span");
    c.className = "pn-confetti";
    c.style.left = `${Math.random() * 100}vw`;
    c.style.background = pick(COLORS);
    c.style.setProperty("--dx", `${Math.random() * 160 - 80}px`);
    c.style.setProperty("--rot", `${Math.random() * 1080 - 540}deg`);
    c.style.setProperty("--t", `${1.8 + Math.random() * 1.6}s`);
    c.style.setProperty("--d", `${Math.random() * 0.6}s`);
    c.style.width = `${6 + Math.random() * 6}px`;
    c.style.height = `${10 + Math.random() * 8}px`;
    c.addEventListener("animationend", () => c.remove());
    fx.appendChild(c);
  }
}

// Cañonazo de confeti: los papelitos saltan desde el elemento y caen con gravedad.
export function confettiPop(el: Element | null, count = 46) {
  if (!el || reduceMotion()) return;
  const r = el.getBoundingClientRect();
  const fx = layer();
  for (let i = 0; i < count; i++) {
    const c = document.createElement("span");
    c.className = "pn-pop";
    c.style.left = `${r.left + Math.random() * r.width}px`;
    c.style.top = `${r.top + r.height / 2}px`;
    c.style.background = pick(COLORS.slice(0, 2).concat(COLORS.slice(3)));
    c.style.width = `${6 + Math.random() * 5}px`;
    c.style.height = `${9 + Math.random() * 7}px`;
    c.style.setProperty("--dx", `${Math.random() * 260 - 130}px`);
    c.style.setProperty("--dy", `${-(70 + Math.random() * 130)}px`);
    c.style.setProperty("--rot", `${Math.random() * 900 - 450}deg`);
    c.style.setProperty("--t", `${1.4 + Math.random() * 0.8}s`);
    c.addEventListener("animationend", () => c.remove());
    fx.appendChild(c);
  }
}
