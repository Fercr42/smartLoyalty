import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { adminDb } from "../../firebase/admin";
import { CARD_FONTS, cleanDesign, type CardDesign, type CardSize } from "../../lib/card-design";
import { cleanLoyalty, formatBalance, type LoyaltyConfig } from "../../lib/loyalty-mode";
import { cleanRewards, type Reward } from "../../lib/rewards";
import { companyLocale, fmt } from "../../i18n/config";
import { messages, type Messages } from "../../i18n/messages";

export const runtime = "nodejs";

// Tarjeta de cliente dibujada con el diseño de la marca y los puntos.
// ?variant=card (1012x638, página del QR) | hero (1032x336, portada de Google Wallet)
// ?s=puntos &code=código &p=diseño sin guardar (vista previa del panel) &v=versión (solo para caché)

const SIZES = { card: { width: 1012, height: 638 }, hero: { width: 1032, height: 336 } };
const LOGO_PX: Record<CardSize, number> = { sm: 84, md: 112, lg: 148 };
const TITLE_PX: Record<CardSize, number> = { sm: 44, md: 58, lg: 74 };

type Company = {
  name: string;
  logoUrl: string;
  brandColor?: string;
  header: string;
  rewards: Reward[];
  loyalty: LoyaltyConfig;
  cardDesign?: unknown;
  pass: Messages["pass"];
  locale: string;
};

// Datos del restaurante en memoria unos segundos: la misma tarjeta se pide muchas veces.
const companyCache = new Map<string, { at: number; data: Company | null }>();
async function loadCompany(companyId: string): Promise<Company | null> {
  const hit = companyCache.get(companyId);
  if (hit && Date.now() - hit.at < 30_000) return hit.data;
  const snap = await adminDb().collection("companies").doc(companyId).get();
  const d = snap.data();
  const data = d
    ? {
        name: d.name ?? "",
        logoUrl: d.logoUrl ?? "",
        brandColor: d.brandColor,
        header: d.walletCard?.header || messages[companyLocale(d)].pass.member,
        rewards: cleanRewards(d.loyalty?.rewards),
        loyalty: cleanLoyalty(d.loyalty),
        cardDesign: d.cardDesign,
        pass: messages[companyLocale(d)].pass,
        locale: companyLocale(d),
      }
    : null;
  companyCache.set(companyId, { at: Date.now(), data });
  return data;
}

const fontCache = new Map<string, Promise<ArrayBuffer>>();
function loadFont(family: string, weight: number, text: string) {
  const key = `${family}:${weight}:${text}`;
  if (!fontCache.has(key)) {
    const promise = (async () => {
      const css = await fetch(
        `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}&text=${encodeURIComponent(text)}`
      ).then((r) => r.text());
      const src = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
      if (!src) throw new Error(`Fuente no disponible: ${family}`);
      return fetch(src).then((r) => r.arrayBuffer());
    })();
    promise.catch(() => fontCache.delete(key));
    fontCache.set(key, promise);
  }
  return fontCache.get(key)!;
}

function rgba(hex: string, alpha: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const q = req.nextUrl.searchParams;
  const variant = q.get("variant") === "hero" ? "hero" : "card";
  const stamps = Math.min(Math.max(parseInt(q.get("s") ?? "0", 10) || 0, 0), 9_999_999);
  const code = (q.get("code") ?? "").replace(/[^A-Za-z0-9]/g, "").slice(0, 8).toUpperCase();
  const preview = q.get("p");

  const company = /^[A-Za-z0-9]{10,64}$/.test(companyId) ? await loadCompany(companyId) : null;
  if (!company) return new Response("Restaurante no encontrado", { status: 404 });

  let design: CardDesign = cleanDesign(company.cardDesign, company.brandColor);
  if (preview && preview.length < 3000) {
    try {
      design = cleanDesign(JSON.parse(Buffer.from(preview, "base64").toString("utf8")), company.brandColor);
    } catch {}
  }

  const origin = req.nextUrl.origin;
  const abs = (u: string) => (u.startsWith("/") ? `${origin}${u}` : u);
  const { width, height } = SIZES[variant];

  // Meta: el primer premio que todavía no alcanza (o el último).
  const next = company.rewards.find((r) => r.stamps > stamps) ?? company.rewards[company.rewards.length - 1];
  // La meta puede ser grande: la tarjeta muestra el número de puntos y una barra.
  const goal = Math.max(next?.stamps ?? 500, 1);
  const filled = Math.min(stamps, goal);
  const number = (value: number) => formatBalance(value, company.loyalty, company.locale);
  const unit = company.pass.unit[company.loyalty.mode];
  const progress = !next
    ? `${number(stamps)} ${unit}`
    : stamps >= next.stamps
      ? fmt(company.pass.rewardReady, { reward: next.title })
      : fmt(company.pass.progress, { filled: number(filled), goal: number(goal), reward: next.title });

  const title = design.font && CARD_FONTS.find((f) => f.id === design.font);
  const allText = `${company.name}${company.header}${progress}${unit}${company.loyalty.currency}#${code}0123456789 de·,.`;
  const fonts: { name: string; data: ArrayBuffer; weight: 400 | 700; style: "normal" }[] = [];
  await Promise.all([
    loadFont("Nunito", 700, allText)
      .then((data) => fonts.push({ name: "Body", data, weight: 700, style: "normal" }))
      .catch(() => {}),
    title
      ? loadFont(title.family, title.weight, allText)
          .then((data) => fonts.push({ name: "Title", data, weight: 700, style: "normal" }))
          .catch(() => {})
      : Promise.resolve(),
    // Tailandés: las fuentes de la marca no traen esas letras; Satori usa esta como respaldo.
    /[\u0E00-\u0E7F]/.test(allText)
      ? loadFont("Noto Sans Thai", 700, allText)
          .then((data) => fonts.push({ name: "Thai", data, weight: 700, style: "normal" }))
          .catch(() => {})
      : Promise.resolve(),
  ]);
  const hasTitleFont = fonts.some((f) => f.name === "Title");
  const hasBodyFont = fonts.some((f) => f.name === "Body");

  const background =
    design.bgType === "gradient"
      ? { backgroundImage: `linear-gradient(${design.bgAngle}deg, ${design.bgColor}, ${design.bgColor2})` }
      : { backgroundColor: design.bgColor };
  const photo = design.bgType === "image" && design.bgImageUrl ? abs(design.bgImageUrl) : "";
  const logo = company.logoUrl ? abs(company.logoUrl) : "";
  const pad = variant === "card" ? 48 : 30;
  const areaWidth = width - pad * 2;

  const logoPx = variant === "card" ? LOGO_PX[design.logoSize] : Math.round(LOGO_PX[design.logoSize] * 0.55);
  const titlePx = variant === "card" ? TITLE_PX[design.titleSize] : Math.round(TITLE_PX[design.titleSize] * 0.55);

  const image = (
    <div
      style={{
        width,
        height,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: pad,
        position: "relative",
        color: design.textColor,
        fontFamily: hasBodyFont ? "Body" : undefined,
        ...background,
      }}
    >
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt="" width={width} height={height} style={{ position: "absolute", left: 0, top: 0, objectFit: "cover" }} />
      ) : null}
      {photo ? (
        <div style={{ position: "absolute", left: 0, top: 0, width, height, backgroundColor: `rgba(0,0,0,${design.bgOverlay})` }} />
      ) : null}

      {variant === "card" ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 26 }}>
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt="" width={logoPx} height={logoPx} style={{ borderRadius: logoPx * 0.22, objectFit: "cover" }} />
            ) : null}
            <div style={{ display: "flex", flexDirection: "column", maxWidth: areaWidth - logoPx - 40 }}>
              <div style={{ fontFamily: hasTitleFont ? "Title" : undefined, fontSize: titlePx, lineHeight: 1.05 }}>{company.name}</div>
              <div style={{ fontSize: 26, opacity: 0.8, marginTop: 6 }}>{company.header}</div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {logo && design.logoSize !== "sm" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt="" width={logoPx} height={logoPx} style={{ borderRadius: logoPx * 0.22, objectFit: "cover" }} />
          ) : null}
          <div style={{ fontFamily: hasTitleFont ? "Title" : undefined, fontSize: titlePx, lineHeight: 1.05 }}>{company.name}</div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", alignSelf: "center", gap: variant === "card" ? 16 : 10 }}>
        <div
          style={{
            fontFamily: hasTitleFont ? "Title" : undefined,
            fontSize: variant === "card" ? 150 : 92,
            lineHeight: 1,
            color: design.accentColor,
          }}
        >
          {number(stamps)}
        </div>
        <div style={{ display: "flex", width: areaWidth, height: variant === "card" ? 22 : 16, borderRadius: 11, backgroundColor: rgba(design.textColor, 0.25), overflow: "hidden" }}>
          <div style={{ display: "flex", width: Math.round((filled / goal) * areaWidth), backgroundColor: design.accentColor }} />
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div style={{ fontSize: variant === "card" ? 30 : 24, color: design.accentColor }}>{progress}</div>
        {code && variant === "card" ? <div style={{ fontSize: 24, opacity: 0.75 }}>{`#${code}`}</div> : null}
      </div>
    </div>
  );

  const response = new ImageResponse(image, { width, height, fonts });
  response.headers.set(
    "Cache-Control",
    preview ? "no-store" : "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800"
  );
  return response;
}
