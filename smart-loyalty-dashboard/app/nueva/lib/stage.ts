// Estado compartido entre el scroll (GSAP) y la escena 3D.
// El scroll escribe "objetivos" y la escena se acerca a ellos suavemente en cada cuadro,
// así la animación nunca salta aunque el scroll sea brusco.

export type CardTarget = { x: number; y: number; z: number; rx: number; ry: number; rz: number; s: number };

// Figuras que forman las partículas.
export const SHAPE = { galaxy: 0, stamps: 1, rings: 2, star: 3, sphere: 4 } as const;

export const stage = {
  shape: SHAPE.galaxy as number, // figura objetivo
  card: { x: 0, y: 0, z: 0, rx: -0.12, ry: 0.32, rz: 0.04, s: 1 } as CardTarget,
  fade: 1, // brillo general de las partículas (0..1)
  stamps: 0, // sellos encendidos en la tarjeta (0..10)
  points: 0, // puntos que muestra la tarjeta
  mouse: { x: 0, y: 0 }, // posición del cursor, -1..1
  paused: false, // true cuando una sección opaca tapa la escena
  intro: 0, // 0..1: las partículas nacen desde el centro
  spin: 0, // giro extra de la tarjeta (cierre)
};
