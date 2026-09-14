import { adminDb } from "../firebase/admin";

// Cobro mensual con PayPal Subscriptions. PAYPAL_ENV=sandbox (pruebas) o live (dinero real).

const DAY = 86_400_000;
const base = () => (process.env.PAYPAL_ENV === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com");
export const paypalPlanId = () => process.env.NEXT_PUBLIC_PAYPAL_PLAN_ID ?? "";

export class BillingMismatch extends Error {}

let cachedToken: { value: string; expires: number } | null = null;

async function accessToken() {
  if (cachedToken && cachedToken.expires > Date.now() + 60_000) return cachedToken.value;
  const credentials = `${process.env.PAYPAL_CLIENT_ID}:${(process.env.PAYPAL_CLIENT_SECRET ?? "").trim()}`;
  const res = await fetch(`${base()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(credentials).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`PayPal OAuth ${res.status}: ${data.error_description ?? data.error}`);
  cachedToken = { value: data.access_token, expires: Date.now() + data.expires_in * 1000 };
  return cachedToken.value;
}

async function paypalApi(path: string, init: RequestInit = {}) {
  return fetch(`${base()}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${await accessToken()}`, "Content-Type": "application/json" },
  });
}

export type PaypalSubscription = {
  id: string;
  status: string; // APPROVAL_PENDING, APPROVED, ACTIVE, SUSPENDED, CANCELLED, EXPIRED
  plan_id: string;
  custom_id?: string;
  billing_info?: { next_billing_time?: string; last_payment?: { time?: string } };
};

export async function getSubscription(id: string): Promise<PaypalSubscription> {
  const res = await paypalApi(`/v1/billing/subscriptions/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(`PayPal ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function cancelSubscription(id: string, reason: string) {
  const res = await paypalApi(`/v1/billing/subscriptions/${encodeURIComponent(id)}/cancel`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
  // 422 = ya estaba cancelada
  if (!res.ok && res.status !== 422) throw new Error(`PayPal ${res.status}: ${await res.text()}`);
}

// Comprueba con PayPal que el aviso (webhook) es auténtico.
export async function verifyWebhook(headers: Headers, rawBody: string) {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) return false;
  const res = await paypalApi("/v1/notifications/verify-webhook-signature", {
    method: "POST",
    body: JSON.stringify({
      auth_algo: headers.get("paypal-auth-algo"),
      cert_url: headers.get("paypal-cert-url"),
      transmission_id: headers.get("paypal-transmission-id"),
      transmission_sig: headers.get("paypal-transmission-sig"),
      transmission_time: headers.get("paypal-transmission-time"),
      webhook_id: webhookId,
      webhook_event: JSON.parse(rawBody),
    }),
  });
  if (!res.ok) return false;
  return (await res.json()).verification_status === "SUCCESS";
}

// Pasa el estado de la suscripción de PayPal al plan del restaurante (custom_id = id del restaurante).
export async function applySubscription(sub: PaypalSubscription, expectedCompanyId?: string) {
  const companyId = sub.custom_id;
  if (!companyId || (expectedCompanyId && companyId !== expectedCompanyId)) {
    throw new BillingMismatch("La suscripción no pertenece a esta cuenta");
  }
  if (sub.plan_id !== paypalPlanId()) throw new BillingMismatch("La suscripción es de otro plan");

  const ref = adminDb().collection("companies").doc(companyId);
  const current = (await ref.get()).data()?.plan ?? {};
  const nextBilling = sub.billing_info?.next_billing_time ? Date.parse(sub.billing_info.next_billing_time) : 0;
  const base = { provider: "paypal", subscriptionId: sub.id, updatedAt: Date.now() };

  let plan: Record<string, unknown>;
  if (sub.status === "ACTIVE" || sub.status === "APPROVED") {
    plan = { ...base, status: "active", paidUntil: nextBilling || Date.now() + 31 * DAY, canceled: false, paymentFailed: false };
  } else if (sub.status === "CANCELLED") {
    // Sin más cobros, pero conserva el acceso hasta el fin del mes pagado.
    plan = current.paidUntil
      ? { ...base, status: "active", paidUntil: current.paidUntil, canceled: true, paymentFailed: false }
      : { ...base, status: "expired", canceled: true };
  } else if (sub.status === "SUSPENDED" || sub.status === "EXPIRED") {
    plan = { ...base, status: "expired", canceled: sub.status === "EXPIRED" };
  } else {
    return null; // APPROVAL_PENDING: todavía no pagó
  }
  await ref.update({ plan });
  return plan;
}

export async function markPaymentFailed(companyId: string) {
  await adminDb().collection("companies").doc(companyId).update({ "plan.paymentFailed": true });
}
