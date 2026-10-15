import { NextRequest } from "next/server";
import { adminAuth, adminDb } from "../../firebase/admin";
import { publicOrigin } from "../../lib/origin";
import { PLAN_EXPIRED_MESSAGE, planState } from "../../lib/plan";
import {
  InputError,
  parseNotificationInput,
  prepareNotification,
  scheduleNotification,
  sendNotification,
} from "../../lib/send-notification";

export const runtime = "nodejs";
export const maxDuration = 60;

const bad = (error: string, status = 400) => Response.json({ error }, { status });

export async function POST(req: NextRequest) {
  const idToken = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!idToken) return bad("No autorizado", 401);

  let uid: string;
  try {
    uid = (await adminAuth().verifyIdToken(idToken)).uid;
  } catch {
    return bad("Sesión inválida", 401);
  }

  try {
    const input = parseNotificationInput(await req.json());
    const companyRef = adminDb().collection("companies").doc(uid);
    const company = await companyRef.get();
    if (!company.exists) return bad("Primero registra tu empresa");
    if (!planState(company.data()?.plan).allowed) return bad(PLAN_EXPIRED_MESSAGE, 402);

    const payload = await prepareNotification(companyRef, input);
    if (input.schedule) {
      const id = await scheduleNotification(uid, payload, input.schedule.sendAt, input.schedule.repeat);
      return Response.json({ scheduled: true, id, sendAt: input.schedule.sendAt });
    }
    return Response.json(await sendNotification(uid, payload, publicOrigin(req.nextUrl.origin)));
  } catch (e) {
    if (e instanceof InputError) return bad(e.message);
    throw e;
  }
}
