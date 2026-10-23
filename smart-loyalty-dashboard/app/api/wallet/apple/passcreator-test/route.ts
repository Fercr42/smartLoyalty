import { NextRequest } from "next/server";
import { passcreatorReady } from "../../../../lib/passcreator-config";
import { passcreatorSelfTest } from "../../../../lib/passcreator";
import { publicOrigin } from "../../../../lib/origin";

export const runtime = "nodejs";
export const maxDuration = 60;

// Prueba de Passcreator: solo existe en la versión de prueba (nunca en producción).
export async function GET(req: NextRequest) {
  if (process.env.VERCEL_ENV === "production") return new Response("No disponible", { status: 404 });
  if (!passcreatorReady()) return Response.json({ ok: false, error: "Faltan PASSCREATOR_API_KEY o PASSCREATOR_TEMPLATE_ID" });
  try {
    return Response.json(await passcreatorSelfTest(publicOrigin(req.nextUrl.origin)));
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
