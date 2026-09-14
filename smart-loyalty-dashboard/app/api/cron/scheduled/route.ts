import { NextRequest } from "next/server";
import { runCron } from "../../../lib/cron-kick";
import { publicOrigin } from "../../../lib/origin";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

// Lo llaman: GitHub Actions cada 5 minutos, el cron diario de Vercel (vercel.json) y cualquier cron externo.
// No necesita clave: solo envía lo que ya tocaba enviar, y cada envío ocurre una vez.
async function handle(req: NextRequest) {
  return Response.json(await runCron(publicOrigin(req.nextUrl.origin)));
}

export const GET = handle;
export const POST = handle;
