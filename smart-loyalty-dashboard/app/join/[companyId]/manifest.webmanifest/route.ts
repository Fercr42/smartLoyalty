import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../firebase/config";
import { DEFAULT_BG, DEFAULT_BRAND, safeColor } from "../../../lib/colors";

// iOS solo permite push si la web se agrega a la pantalla de inicio;
// este manifest hace que el acceso directo abra la página del restaurante.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const { companyId } = await params;
  let name = "Promociones";
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
      start_url: `/join/${companyId}`,
      scope: "/",
      display: "standalone",
      background_color: bg,
      theme_color: brand,
      icons: logoUrl
        ? [{ src: logoUrl, sizes: "any", purpose: "any" }]
        : [{ src: "/favicon.ico", sizes: "48x48" }],
    },
    { headers: { "Content-Type": "application/manifest+json" } }
  );
}
