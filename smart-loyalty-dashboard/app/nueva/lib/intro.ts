// Aviso de "terminó la intro": el loader lo dispara y el resto de la página espera por él.
// Si alguien se suscribe tarde, igual recibe el aviso.
let started = false;
const listeners = new Set<() => void>();

export const intro = {
  start() {
    if (started) return;
    started = true;
    listeners.forEach((cb) => cb());
  },
  on(cb: () => void) {
    if (started) cb();
    else listeners.add(cb);
    return () => listeners.delete(cb);
  },
  reset() {
    started = false;
  },
};
