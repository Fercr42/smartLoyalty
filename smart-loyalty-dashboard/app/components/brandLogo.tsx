import { Quicksand } from "next/font/google";

// Logo de Smart Loyalty: tarjeta con estrella + "Smart" (tinta) "Loyalty" (verde).

const quicksand = Quicksand({ subsets: ["latin"], weight: ["700"], display: "swap" });

export const BRAND_GREEN = "#22a67b";
export const BRAND_INK = "#1c2733";

export function BrandMark({ size = 32, color = BRAND_GREEN }: { size?: number; color?: string }) {
  return (
    <svg width={Math.round(size * 1.28)} height={size} viewBox="0 0 64 50" aria-hidden focusable="false">
      <g transform="rotate(-17 32 27)" fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 8.5H46a7 7 0 0 1 7 7" />
        <rect x="8" y="14" width="46" height="30" rx="7" />
        <path d="M9 23.5H53" />
      </g>
      <path d="M42.5 26.5l2.1 4.2 4.6.6-3.4 3.2.8 4.5-4.1-2.2-4.1 2.2.8-4.5-3.4-3.2 4.6-.6z" fill={color} />
    </svg>
  );
}

export default function BrandLogo({
  size = 32,
  inverted = false,
  className = "",
}: {
  size?: number;
  inverted?: boolean;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`} role="img" aria-label="Smart Loyalty">
      <BrandMark size={size} />
      <span
        className={quicksand.className}
        style={{ fontSize: Math.round(size * 0.8), lineHeight: 1, fontWeight: 700, letterSpacing: "-0.01em", whiteSpace: "nowrap" }}
      >
        <span style={{ color: inverted ? "#ffffff" : BRAND_INK }}>Smart</span>
        <span style={{ color: BRAND_GREEN }}>Loyalty</span>
      </span>
    </span>
  );
}
