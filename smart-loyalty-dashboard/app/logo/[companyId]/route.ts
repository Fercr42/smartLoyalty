import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase/config";

// Sirve el logo guardado en Firestore como imagen normal (para <img>, notificaciones y el ícono de inicio).
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const { companyId } = await params;
  const snap = await getDoc(doc(db, "companies", companyId));
  const match = /^data:(image\/[\w+.-]+);base64,(.+)$/.exec(snap.data()?.logoData ?? "");
  if (!match) return new Response("Sin logo", { status: 404 });

  return new Response(Buffer.from(match[2], "base64"), {
    headers: {
      "Content-Type": match[1],
      "Cache-Control": "public, max-age=300, s-maxage=86400",
    },
  });
}
