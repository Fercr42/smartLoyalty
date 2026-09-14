import { NextRequest } from "next/server";
import { runAutomations } from "../../../lib/automations";
import { publicOrigin } from "../../../lib/origin";
import { runDueJobs } from "../../../lib/send-notification";
import { cleanupSubscribers } from "../../../lib/subscriber-cleanup";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

// Lo llama GitHub Actions cada 5 minutos (.github/workflows/scheduled-notifications.yml).
// No necesita clave: solo envía lo que ya tocaba enviar, y cada envío ocurre una vez.
async function handle(req: NextRequest) {
  const origin = publicOrigin(req.nextUrl.origin);
  const results = await runDueJobs(origin);
  const automations = await runAutomations(origin);
  const cleanup = await cleanupSubscribers().catch((e) => {
    console.error("Limpieza de suscriptores", e);
    return { error: true };
  });
  return Response.json({ processed: results.length, results, automations, cleanup });
}

export const GET = handle;
export const POST = handle;
