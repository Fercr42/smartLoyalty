import { NextRequest } from "next/server";
import { adminAuth } from "../../../../firebase/admin";
import { applySubscription, BillingMismatch, getSubscription } from "../../../../lib/paypal";

export const runtime = "nodejs";

// Después de aprobar el pago en PayPal: confirmar la suscripción con PayPal y activar el plan.
export async function POST(req: NextRequest) {
  const idToken = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!idToken) return Response.json({ error: "No autorizado" }, { status: 401 });
  let uid: string;
  try {
    uid = (await adminAuth().verifyIdToken(idToken)).uid;
  } catch {
    return Response.json({ error: "Sesión inválida" }, { status: 401 });
  }

  const { subscriptionId } = await req.json().catch(() => ({}));
  if (typeof subscriptionId !== "string" || !/^I-[A-Z0-9]{6,}$/.test(subscriptionId)) {
    return Response.json({ error: "Suscripción inválida" }, { status: 400 });
  }

  try {
    const plan = await applySubscription(await getSubscription(subscriptionId), uid);
    if (!plan) return Response.json({ error: "PayPal todavía no confirma el pago. Espera un momento y recarga." }, { status: 409 });
    return Response.json({ plan });
  } catch (e) {
    if (e instanceof BillingMismatch) return Response.json({ error: e.message }, { status: 403 });
    console.error("Activar PayPal", e);
    return Response.json({ error: "No se pudo confirmar el pago con PayPal. Inténtalo de nuevo." }, { status: 502 });
  }
}
