import { timingSafeEqual } from "crypto";
import { NextRequest } from "next/server";
import { adminDb } from "../../../firebase/admin";
import { runCron } from "../../../lib/cron-kick";
import { publicOrigin } from "../../../lib/origin";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

// Lo llaman: GitHub Actions cada 5 minutos y el cron diario de Vercel (vercel.json).
// Con CRON_SECRET puesto en Vercel, exige "Authorization: Bearer {CRON_SECRET}" (Vercel Cron lo manda solo).
// Sin CRON_SECRET, cualquiera puede llamarlo, pero corre como máximo una vez por minuto.
const MIN_GAP_MS = 60_000;

function authorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return null; // sin clave configurada
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const wanted = Buffer.from(`Bearer ${secret}`);
  return given.length === wanted.length && timingSafeEqual(given, wanted);
}

async function claimRun() {
  const db = adminDb();
  const ref = db.collection("system").doc("cron");
  return db.runTransaction(async (tx) => {
    const last = (await tx.get(ref)).data()?.lastManual ?? 0;
    if (Date.now() - last < MIN_GAP_MS) return false;
    tx.set(ref, { lastManual: Date.now() }, { merge: true });
    return true;
  });
}

async function handle(req: NextRequest) {
  const auth = authorized(req);
  if (auth === false) return Response.json({ error: "No autorizado" }, { status: 401 });
  if (auth === null && !(await claimRun())) return Response.json({ skipped: true });
  return Response.json(await runCron(publicOrigin(req.nextUrl.origin)));
}

export const GET = handle;
export const POST = handle;
