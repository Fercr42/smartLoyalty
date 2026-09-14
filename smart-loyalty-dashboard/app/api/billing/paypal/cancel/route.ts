import { NextRequest } from "next/server";
import { adminAuth, adminDb } from "../../../../firebase/admin";
import { applySubscription, cancelSubscription, getSubscription } from "../../../../lib/paypal";

export const runtime = "nodejs";

// Cancelar la suscripción: PayPal deja de cobrar y el plan sigue activo hasta el fin del mes pagado.
export async function POST(req: NextRequest) {
  const idToken = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!idToken) return Response.json({ error: "No autorizado" }, { status: 401 });
  let uid: string;
  try {
    uid = (await adminAuth().verifyIdToken(idToken)).uid;
  } catch {
    return Response.json({ error: "Sesión inválida" }, { status: 401 });
  }

  const plan = (await adminDb().collection("companies").doc(uid).get()).data()?.plan ?? {};
  if (plan.provider !== "paypal" || !plan.subscriptionId) {
    return Response.json({ error: "No tienes una suscripción de PayPal activa" }, { status: 400 });
  }

  try {
    await cancelSubscription(plan.subscriptionId, "Cancelada por el dueño desde el panel");
    const updated = await applySubscription(await getSubscription(plan.subscriptionId), uid);
    return Response.json({ plan: updated });
  } catch (e) {
    console.error("Cancelar PayPal", e);
    return Response.json({ error: "No se pudo cancelar en PayPal. Inténtalo de nuevo." }, { status: 502 });
  }
}
