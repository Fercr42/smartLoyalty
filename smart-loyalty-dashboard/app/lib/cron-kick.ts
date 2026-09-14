import { after } from "next/server";
import { adminDb } from "../firebase/admin";
import { runAutomations } from "./automations";
import { runDueJobs } from "./send-notification";
import { cleanupSubscribers } from "./subscriber-cleanup";

// Todo lo que corre "solo": envíos programados, automatizaciones y limpieza de suscriptores.
export async function runCron(origin: string) {
  const results = await runDueJobs(origin);
  const automations = await runAutomations(origin);
  const cleanup = await cleanupSubscribers().catch((e) => {
    console.error("Limpieza de suscriptores", e);
    return { error: true };
  });
  await adminDb().collection("system").doc("cron").set({ lastRun: Date.now() }, { merge: true });
  return { processed: results.length, results, automations, cleanup };
}

const KICK_EVERY_MS = 2 * 60_000;

// Respaldo por si el cron externo se atrasa (GitHub puede tardar horas): cuando alguien usa el sitio,
// revisar lo pendiente como máximo cada 2 minutos, después de responder para no hacer esperar a nadie.
export function kickCron(origin: string) {
  after(async () => {
    try {
      const db = adminDb();
      const ref = db.collection("system").doc("cron");
      const claimed = await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const last = Math.max(snap.data()?.lastRun ?? 0, snap.data()?.lastKick ?? 0);
        if (Date.now() - last < KICK_EVERY_MS) return false;
        tx.set(ref, { lastKick: Date.now() }, { merge: true });
        return true;
      });
      if (claimed) await runCron(origin);
    } catch (e) {
      console.error("Cron de respaldo", e);
    }
  });
}
