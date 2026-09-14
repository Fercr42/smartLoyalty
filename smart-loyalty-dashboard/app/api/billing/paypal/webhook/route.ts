import { NextRequest } from "next/server";
import {
  applySubscription,
  BillingMismatch,
  getSubscription,
  markPaymentFailed,
  verifyWebhook,
} from "../../../../lib/paypal";

export const runtime = "nodejs";

const SUBSCRIPTION_EVENTS = new Set([
  "BILLING.SUBSCRIPTION.ACTIVATED",
  "BILLING.SUBSCRIPTION.RE-ACTIVATED",
  "BILLING.SUBSCRIPTION.UPDATED",
  "BILLING.SUBSCRIPTION.CANCELLED",
  "BILLING.SUBSCRIPTION.SUSPENDED",
  "BILLING.SUBSCRIPTION.EXPIRED",
]);

// Avisos de PayPal: cobros mensuales, cancelaciones, suspensiones y pagos fallidos.
// Siempre se vuelve a consultar la suscripción en PayPal en vez de confiar en el aviso.
export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!(await verifyWebhook(req.headers, raw).catch(() => false))) {
    return Response.json({ error: "Aviso no verificado" }, { status: 401 });
  }

  const event = JSON.parse(raw);
  const resource = event.resource ?? {};
  try {
    if (event.event_type === "PAYMENT.SALE.COMPLETED" && resource.billing_agreement_id) {
      await applySubscription(await getSubscription(resource.billing_agreement_id));
    } else if (event.event_type === "BILLING.SUBSCRIPTION.PAYMENT.FAILED" && resource.id) {
      const sub = await getSubscription(resource.id);
      if (sub.custom_id) await markPaymentFailed(sub.custom_id);
    } else if (SUBSCRIPTION_EVENTS.has(event.event_type) && resource.id) {
      await applySubscription(await getSubscription(resource.id));
    }
  } catch (e) {
    if (e instanceof BillingMismatch) return Response.json({ ignored: e.message });
    console.error("PayPal webhook", event.event_type, e);
    return Response.json({ error: "Error procesando el aviso" }, { status: 500 }); // PayPal lo reintenta
  }
  return Response.json({ ok: true });
}
