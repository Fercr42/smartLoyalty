// Logo oficial de Smart Loyalty (public/brand/logo.png y mark.png, fondo transparente).

export const BRAND_GREEN = "#22a67b";
export const BRAND_INK = "#1c2733";

export function BrandMark({ size = 32 }: { size?: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/brand/mark.png" alt="" aria-hidden style={{ height: size, width: "auto" }} />;
}

export default function BrandLogo({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/logo.png"
      alt="Smart Loyalty"
      className={`inline-block max-w-full ${className}`}
      style={{ height: size, width: "auto" }}
    />
  );
}
