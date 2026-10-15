import { NextRequest } from "next/server";
import { appleConfig } from "../../../../../../../../lib/apple-wallet";
import { DEVICE_ID, updatedSerials } from "../../../../../../../../lib/apple-wallet-updates";

export const runtime = "nodejs";

// El iPhone recibió un aviso y pregunta qué pases cambiaron desde la última vez.
// Esta llamada no trae token (Apple no lo manda aquí); solo devuelve números de serie.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ deviceId: string; passTypeId: string }> }
) {
  const config = appleConfig();
  const { deviceId, passTypeId } = await params;
  if (!config) return new Response(null, { status: 503 });
  if (passTypeId !== config.passTypeId || !DEVICE_ID.test(deviceId)) return new Response(null, { status: 404 });
  const result = await updatedSerials(deviceId, req.nextUrl.searchParams.get("passesUpdatedSince"));
  if (!result) return new Response(null, { status: 204 });
  return Response.json(result);
}
