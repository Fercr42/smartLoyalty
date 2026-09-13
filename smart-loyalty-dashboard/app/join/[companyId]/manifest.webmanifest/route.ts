import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../firebase/config";

// iOS solo permite push si la web se agrega a la pantalla de inicio;
// este manifest hace que el acceso directo abra la página del restaurante.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const { companyId } = await params;
  let name = "Promociones";
  let logoUrl = "";
  try {
    const snap = await getDoc(doc(db, "companies", companyId));
    if (snap.exists()) {
      name = snap.data().name || name;
      logoUrl = snap.data().logoUrl || "";
    }
  } catch {}

  return Response.json(
    {
      name,
      short_name: name.slice(0, 12),
      start_url: `/join/${companyId}`,
      scope: "/",
      display: "standalone",
      background_color: "#ffffff",
      theme_color: "#111827",
      icons: logoUrl
        ? [{ src: logoUrl, sizes: "any", purpose: "any" }]
        : [{ src: "/favicon.ico", sizes: "48x48" }],
    },
    { headers: { "Content-Type": "application/manifest+json" } }
  );
}
