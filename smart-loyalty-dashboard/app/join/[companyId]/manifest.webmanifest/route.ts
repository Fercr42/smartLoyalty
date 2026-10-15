import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../firebase/config";
import { DEFAULT_BG, DEFAULT_BRAND, safeColor } from "../../../lib/colors";
import { LOCALE_COOKIE, pickLocale } from "../../../i18n/config";
import { messages } from "../../../i18n/messages";

// iOS solo permite push si la web se agrega a la pantalla de inicio;
// este manifest hace que el acceso directo abra la página del restaurante.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const { companyId } = await params;
  // ?m= lleva la tarjeta del cliente al ícono de inicio (ver lib/member-id.ts).
  const memberId = new URL(req.url).searchParams.get("m") ?? "";
  // Sin ?m= no se pone start_url: así el iPhone abre la dirección actual de la página, que ya lleva
  // la tarjeta (joinClient la agrega). Con start_url fijo, el ícono abría /join sin tarjeta y creaba otra.
  const startUrl = /^[0-9a-f-]{36}$/i.test(memberId) ? `/join/${companyId}?m=${memberId}` : null;
  const cookie = req.headers.get("cookie")?.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=([a-z]{2})`))?.[1];
  let name = messages[pickLocale(cookie, req.headers.get("accept-language"))].join.appName;
  let logoUrl = "";
  let brand = DEFAULT_BRAND;
  let bg = DEFAULT_BG;
  try {
    const snap = await getDoc(doc(db, "companies", companyId));
    if (snap.exists()) {
      const data = snap.data();
      name = data.name || name;
      logoUrl = data.logoUrl || "";
      brand = safeColor(data.brandColor, DEFAULT_BRAND);
      bg = safeColor(data.bgColor, DEFAULT_BG);
    }
  } catch {}

  return Response.json(
    {
      name,
      short_name: name.slice(0, 12),
      ...(startUrl ? { start_url: startUrl } : {}),
      scope: "/",
      display: "standalone",
      background_color: bg,
      theme_color: brand,
      icons: logoUrl
        ? [{ src: logoUrl, sizes: "any", purpose: "any" }]
        : [{ src: "/icon.png", sizes: "512x512", type: "image/png" }],
    },
    { headers: { "Content-Type": "application/manifest+json" } }
  );
}
