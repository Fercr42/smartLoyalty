export const DEFAULT_BRAND = "#111827";
export const DEFAULT_BG = "#f3f4f6";

const HEX = /^#[0-9a-f]{6}$/i;

export const safeColor = (color: unknown, fallback: string) =>
  typeof color === "string" && HEX.test(color) ? color : fallback;

// Texto negro o blanco según qué se lea mejor sobre el color (luminancia WCAG).
export function textOn(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.179 ? "#111827" : "#ffffff";
}
