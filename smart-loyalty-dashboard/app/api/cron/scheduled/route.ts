import { NextRequest } from "next/server";
import { runAutomations } from "../../../lib/automations";
import { publicOrigin } from "../../../lib/origin";
import { runDueJobs } from "../../../lib/send-notification";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

// Lo llama GitHub Actions cada 5 minutos (.github/workflows/scheduled-notifications.yml).
// No necesita clave: solo envía lo que ya tocaba enviar, y cada envío ocurre una vez.
async function handle(req: NextRequest) {
  const origin = publicOrigin(req.nextUrl.origin);
  const results = await runDueJobs(origin);
  const automations = await runAutomations(origin);
  return Response.json({ processed: results.length, results, automations });
}

export const GET = handle;
export const POST = handle;
