import { NextRequest } from "next/server";
import { publicOrigin } from "../../../lib/origin";
import { runDueJobs } from "../../../lib/send-notification";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

// Lo llama GitHub Actions cada 5 minutos (.github/workflows/scheduled-notifications.yml).
// No necesita clave: solo envía lo que ya tocaba enviar, y cada trabajo se envía una vez.
async function handle(req: NextRequest) {
  const results = await runDueJobs(publicOrigin(req.nextUrl.origin));
  return Response.json({ processed: results.length, results });
}

export const GET = handle;
export const POST = handle;
