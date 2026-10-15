// Efecto de letras que se revuelven hasta formar el texto final (guiño a los paneles de datos).
const GLYPHS = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789+#%*";

export function scramble(el: HTMLElement, text: string, duration = 600) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) {
    el.textContent = text;
    return;
  }
  const start = performance.now();
  const id = Number(el.dataset.scrambleId ?? 0) + 1;
  el.dataset.scrambleId = String(id);
  const step = (now: number) => {
    if (el.dataset.scrambleId !== String(id)) return; // empezó otro
    const p = Math.min(1, (now - start) / duration);
    const fixed = Math.floor(p * text.length);
    let out = text.slice(0, fixed);
    for (let i = fixed; i < text.length; i++) out += text[i] === " " ? " " : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
    el.textContent = out;
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
