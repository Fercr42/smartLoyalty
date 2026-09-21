// Diseño de la tarjeta de cada marca (companies/{id}.cardDesign). Se usa en el navegador y en el servidor.
// La tarjeta se dibuja como imagen en /card-image/[companyId] (página del QR y portada de Google Wallet).

export type CardSize = "sm" | "md" | "lg";

export type CardDesign = {
  template: string;
  bgType: "solid" | "gradient" | "image";
  bgColor: string;
  bgColor2: string;
  bgAngle: number;
  bgImageUrl: string;
  bgOverlay: number; // oscurecer la foto, 0 a 0.8
  textColor: string;
  accentColor: string; // puntos llenos y progreso
  font: string;
  logoSize: CardSize;
  titleSize: CardSize;
  stampIcon: string;
  stampIconUrl: string;
  useInWallet: boolean;
  version?: number;
};

export const CARD_FONTS = [
  { id: "poppins", label: "Poppins", family: "Poppins", weight: 700 },
  { id: "montserrat", label: "Montserrat", family: "Montserrat", weight: 800 },
  { id: "playfair", label: "Playfair Display", family: "Playfair Display", weight: 700 },
  { id: "bebas", label: "Bebas Neue", family: "Bebas Neue", weight: 400 },
  { id: "pacifico", label: "Pacifico", family: "Pacifico", weight: 400 },
  { id: "lobster", label: "Lobster", family: "Lobster", weight: 400 },
  { id: "oswald", label: "Oswald", family: "Oswald", weight: 700 },
  { id: "robotoslab", label: "Roboto Slab", family: "Roboto Slab", weight: 700 },
  { id: "nunito", label: "Nunito", family: "Nunito", weight: 800 },
  { id: "bricolage", label: "Bricolage Grotesque", family: "Bricolage Grotesque", weight: 700 },
] as const;

export const STAMP_ICONS = [
  { id: "circle", label: "Círculo" },
  { id: "star", label: "Estrella" },
  { id: "heart", label: "Corazón" },
  { id: "check", label: "Check" },
  { id: "crown", label: "Corona" },
  { id: "coffee", label: "Café" },
  { id: "burger", label: "Hamburguesa" },
  { id: "pizza", label: "Pizza" },
  { id: "logo", label: "Tu logo" },
  { id: "custom", label: "Tu ícono" },
] as const;

const BASE: CardDesign = {
  template: "classic",
  bgType: "solid",
  bgColor: "#0e7c66",
  bgColor2: "#0a4a3e",
  bgAngle: 135,
  bgImageUrl: "",
  bgOverlay: 0.45,
  textColor: "#ffffff",
  accentColor: "#f2b134",
  font: "poppins",
  logoSize: "md",
  titleSize: "md",
  stampIcon: "circle",
  stampIconUrl: "",
  useInWallet: true,
};

export const CARD_TEMPLATES: { id: string; label: string; design: Partial<CardDesign> }[] = [
  { id: "classic", label: "Clásica", design: { bgType: "solid", textColor: "#ffffff", accentColor: "#f2b134", font: "poppins", logoSize: "md", titleSize: "md", stampIcon: "circle" } },
  { id: "modern", label: "Moderna", design: { bgType: "gradient", bgColor: "#111827", bgColor2: "#4f46e5", bgAngle: 135, textColor: "#ffffff", accentColor: "#a5b4fc", font: "montserrat", logoSize: "md", titleSize: "md", stampIcon: "star" } },
  { id: "elegant", label: "Elegante", design: { bgType: "solid", bgColor: "#1c1917", textColor: "#f5f0e6", accentColor: "#d4a24c", font: "playfair", logoSize: "md", titleSize: "lg", stampIcon: "crown" } },
  { id: "fun", label: "Divertida", design: { bgType: "gradient", bgColor: "#ff7a18", bgColor2: "#ff3d77", bgAngle: 120, textColor: "#ffffff", accentColor: "#fff7ad", font: "pacifico", logoSize: "md", titleSize: "lg", stampIcon: "heart" } },
  { id: "minimal", label: "Minimalista", design: { bgType: "solid", bgColor: "#ffffff", textColor: "#111418", accentColor: "#111418", font: "nunito", logoSize: "sm", titleSize: "md", stampIcon: "check" } },
  { id: "photo", label: "Con foto", design: { bgType: "image", bgColor: "#222222", bgOverlay: 0.5, textColor: "#ffffff", accentColor: "#ffd166", font: "bebas", logoSize: "md", titleSize: "lg", stampIcon: "burger" } },
];

const HEX = /^#[0-9a-f]{6}$/i;
const color = (v: unknown, fallback: string) => (typeof v === "string" && HEX.test(v) ? v : fallback);
const oneOf = <T extends string>(v: unknown, options: readonly T[], fallback: T): T =>
  options.includes(v as T) ? (v as T) : fallback;
const url = (v: unknown) =>
  typeof v === "string" && (v.startsWith("/") || v.startsWith("https://")) ? v.slice(0, 500) : "";

export function templateDesign(templateId: string, current: Partial<CardDesign> = {}, brandColor?: string): CardDesign {
  const template = CARD_TEMPLATES.find((t) => t.id === templateId) ?? CARD_TEMPLATES[0];
  const brand = color(brandColor, BASE.bgColor);
  return cleanDesign({
    ...BASE,
    bgColor: templateId === "classic" ? brand : BASE.bgColor,
    ...template.design,
    template: template.id,
    // Conservar lo que la marca subió.
    bgImageUrl: current.bgImageUrl ?? "",
    stampIconUrl: current.stampIconUrl ?? "",
    useInWallet: current.useInWallet ?? true,
  });
}

export function cleanDesign(raw: unknown, brandColor?: string): CardDesign {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const fonts = CARD_FONTS.map((f) => f.id);
  const icons = STAMP_ICONS.map((i) => i.id);
  const angle = Number(r.bgAngle);
  const overlay = Number(r.bgOverlay);
  return {
    template: typeof r.template === "string" ? r.template.slice(0, 20) : "custom",
    bgType: oneOf(r.bgType, ["solid", "gradient", "image"] as const, "solid"),
    bgColor: color(r.bgColor, color(brandColor, BASE.bgColor)),
    bgColor2: color(r.bgColor2, BASE.bgColor2),
    bgAngle: Number.isFinite(angle) ? Math.min(Math.max(Math.round(angle), 0), 360) : BASE.bgAngle,
    bgImageUrl: url(r.bgImageUrl),
    bgOverlay: Number.isFinite(overlay) ? Math.min(Math.max(overlay, 0), 0.8) : BASE.bgOverlay,
    textColor: color(r.textColor, BASE.textColor),
    accentColor: color(r.accentColor, BASE.accentColor),
    font: oneOf(r.font, fonts, "poppins"),
    logoSize: oneOf(r.logoSize, ["sm", "md", "lg"] as const, "md"),
    titleSize: oneOf(r.titleSize, ["sm", "md", "lg"] as const, "md"),
    stampIcon: oneOf(r.stampIcon, icons, "circle"),
    stampIconUrl: url(r.stampIconUrl),
    useInWallet: r.useInWallet !== false,
    ...(Number.isFinite(Number(r.version)) && r.version ? { version: Number(r.version) } : {}),
  };
}

// Diseño -> texto corto para la vista previa (?p=) sin guardar.
export function encodeDesign(design: CardDesign) {
  const json = JSON.stringify({ ...design, version: undefined });
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}
