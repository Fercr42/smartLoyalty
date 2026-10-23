import { ImageResponse } from "next/og";
import type { WalletCompany } from "./google-wallet";
import { passColors, stripSource, type PassImages } from "./apple-wallet";

// Imágenes del pase de Apple Wallet. Apple solo acepta PNG y tamaños fijos (@1x, @2x, @3x),
// así que el logo y la portada (que pueden ser JPG o WebP) se vuelven a dibujar aquí.

const ICON = 29; // 29, 58, 87
const LOGO = { width: 160, height: 50 }; // hasta 160x50 en @1x
const STRIP = { width: 375, height: 123 }; // franja de storeCard en @1x
const SCALES = [1, 2, 3] as const;
const suffix = (scale: number) => (scale === 1 ? "" : `@${scale}x`);

const absolute = (url: string | undefined, origin: string) => (url?.startsWith("/") ? `${origin}${url}` : url ?? "");

async function png(element: React.ReactElement, width: number, height: number) {
  const res = new ImageResponse(element, { width, height });
  return Buffer.from(await res.arrayBuffer());
}

// Una imagen remota se puede dibujar solo si responde; si no, se usa el respaldo.
async function reachable(url: string) {
  if (!url.startsWith("https://") && !url.startsWith("http://")) return false;
  try {
    const res = await fetch(url, { method: "GET", signal: AbortSignal.timeout(8000) });
    return res.ok && (res.headers.get("content-type") ?? "").startsWith("image/");
  } catch {
    return false;
  }
}

// stripUrl: franja a usar en lugar de la normal ("" = sin franja). La usa Passcreator, que tiene una sola
// franja para todos los clientes y por eso no puede llevar los puntos dibujados.
export async function renderPassImages(company: WalletCompany, origin: string, stamps: number, stripUrl?: string): Promise<PassImages> {
  const colors = passColors(company);
  const logoUrl = absolute(company.logoUrl, origin);
  const wideLogo = absolute(company.walletCard?.wideLogoUrl, origin);
  const strip = stripUrl ?? stripSource(company, origin, stamps);
  const [hasLogo, hasWide, hasStrip] = await Promise.all([reachable(logoUrl), reachable(wideLogo), reachable(strip)]);
  const initial = (company.name ?? "").trim().charAt(0).toUpperCase() || "★";
  const images: PassImages = {};

  await Promise.all(
    SCALES.map(async (scale) => {
      const s = suffix(scale);
      const icon = ICON * scale;
      // Ícono: el logo sobre fondo blanco, o la inicial del negocio sobre su color.
      images[`icon${s}.png` as keyof PassImages] = await png(
        hasLogo ? (
          <div style={{ display: "flex", width: "100%", height: "100%", background: "#ffffff", alignItems: "center", justifyContent: "center" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoUrl} width={icon * 0.86} height={icon * 0.86} style={{ objectFit: "contain" }} alt="" />
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              width: "100%",
              height: "100%",
              background: colors.background,
              color: colors.foreground,
              alignItems: "center",
              justifyContent: "center",
              fontSize: icon * 0.6,
              fontWeight: 700,
            }}
          >
            {initial}
          </div>
        ),
        icon,
        icon
      );

      // Logo arriba a la izquierda: el logo ancho si existe, si no el logo cuadrado (el nombre va al lado).
      const logoSrc = hasWide ? wideLogo : hasLogo ? logoUrl : "";
      if (logoSrc) {
        const width = (hasWide ? LOGO.width : LOGO.height) * scale;
        const height = LOGO.height * scale;
        images[`logo${s}.png` as keyof PassImages] = await png(
          <div style={{ display: "flex", width: "100%", height: "100%", alignItems: "center" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoSrc} width={width} height={height} style={{ objectFit: "contain", objectPosition: "left" }} alt="" />
          </div>,
          width,
          height
        );
      }

      // Franja: la tarjeta dibujada con los puntos, o la portada.
      if (hasStrip) {
        const width = STRIP.width * scale;
        const height = STRIP.height * scale;
        images[`strip${s}.png` as keyof PassImages] = await png(
          <div style={{ display: "flex", width: "100%", height: "100%", background: colors.background }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={strip} width={width} height={height} style={{ objectFit: "cover" }} alt="" />
          </div>,
          width,
          height
        );
      }
    })
  );
  return images;
}
