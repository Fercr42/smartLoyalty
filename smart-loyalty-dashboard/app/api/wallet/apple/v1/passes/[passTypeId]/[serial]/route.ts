import { NextRequest } from "next/server";
import { appleConfig, parseSerial, validPassAuth } from "../../../../../../../lib/apple-wallet";
import { buildMemberPass } from "../../../../../../../lib/apple-wallet-updates";
import { publicOrigin } from "../../../../../../../lib/origin";

export const runtime = "nodejs";
export const maxDuration = 30;

// El iPhone descarga la versión nueva del pase (puntos, nombre, diseño o promo).
export async function GET(req: NextRequest, { params }: { params: Promise<{ passTypeId: string; serial: string }> }) {
  const config = appleConfig();
  const { passTypeId, serial } = await params;
  if (!config) return new Response(null, { status: 503 });
  const parsed = parseSerial(serial);
  if (passTypeId !== config.passTypeId || !parsed) return new Response(null, { status: 404 });
  if (!validPassAuth(req.headers.get("authorization"), serial, config.authSecret)) {
    return new Response(null, { status: 401 });
  }
  try {
    const pass = await buildMemberPass(parsed.companyId, parsed.memberId, publicOrigin(req.nextUrl.origin));
    if (!pass) return new Response(null, { status: 404 });
    return new Response(new Uint8Array(pass), {
      headers: {
        "Content-Type": "application/vnd.apple.pkpass",
        "Last-Modified": new Date().toUTCString(),
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("Apple Wallet actualizar", e);
    return new Response(null, { status: 500 });
  }
}
