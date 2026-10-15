import { NextRequest } from "next/server";
import { appleConfig, validPassAuth } from "../../../../../../../../../lib/apple-wallet";
import { DEVICE_ID, PUSH_TOKEN, registerDevice, unregisterDevice } from "../../../../../../../../../lib/apple-wallet-updates";

export const runtime = "nodejs";

// Servicio web de Apple Wallet: el iPhone avisa cuando guarda o borra un pase.
// https://developer.apple.com/documentation/walletpasses/adding-a-web-service-to-update-passes

type Params = { params: Promise<{ deviceId: string; passTypeId: string; serial: string }> };

async function check(req: NextRequest, params: Params["params"]) {
  const config = appleConfig();
  const { deviceId, passTypeId, serial } = await params;
  if (!config) return { error: new Response(null, { status: 503 }) };
  if (passTypeId !== config.passTypeId || !DEVICE_ID.test(deviceId)) return { error: new Response(null, { status: 404 }) };
  if (!validPassAuth(req.headers.get("authorization"), serial, config.authSecret)) {
    return { error: new Response(null, { status: 401 }) };
  }
  return { deviceId, serial };
}

export async function POST(req: NextRequest, { params }: Params) {
  const checked = await check(req, params);
  if (checked.error) return checked.error;
  const { pushToken } = await req.json().catch(() => ({}));
  if (!PUSH_TOKEN.test(pushToken ?? "")) return new Response(null, { status: 400 });
  const created = await registerDevice(checked.deviceId, checked.serial, pushToken);
  if (created === null) return new Response(null, { status: 404 });
  return new Response(null, { status: created ? 201 : 200 });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const checked = await check(req, params);
  if (checked.error) return checked.error;
  await unregisterDevice(checked.deviceId, checked.serial);
  return new Response(null, { status: 200 });
}
