"use client";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { PLAN_PRICE_USD, planState, type Plan, type PlanState } from "../lib/plan";

// Suscripción mensual con los botones de PayPal (PayPal o tarjeta).

const CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ?? "";
const PLAN_ID = process.env.NEXT_PUBLIC_PAYPAL_PLAN_ID ?? "";
const SANDBOX = process.env.NEXT_PUBLIC_PAYPAL_ENV !== "live";

type PaypalButtons = { render: (el: HTMLElement) => Promise<void>; close?: () => Promise<void> };
type PaypalActions = { subscription: { create: (options: Record<string, unknown>) => Promise<string> } };
declare global {
  interface Window {
    paypal?: { Buttons: (options: Record<string, unknown>) => PaypalButtons };
  }
}

const formatDate = (ms: number) => new Date(ms).toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" });

function loadPaypalSdk() {
  // Sin "locale": PayPal usa el idioma del navegador (es_XC da error de validación).
  const src = `https://www.paypal.com/sdk/js?client-id=${CLIENT_ID}&vault=true&intent=subscription`;
  return new Promise<void>((resolve, reject) => {
    if (window.paypal) return resolve();
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    const script = existing ?? document.createElement("script");
    script.addEventListener("load", () => resolve());
    script.addEventListener("error", () => reject(new Error("No se pudo cargar PayPal")));
    if (!existing) {
      script.src = src;
      document.body.appendChild(script);
    }
  });
}

export default function BillingPanel({
  plan,
  onPlanChange,
}: {
  plan: PlanState;
  onPlanChange: (plan: PlanState) => void;
}) {
  const { user } = useAuth();
  const buttonsRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  const paidWithPaypal = plan.status === "active" && plan.provider === "paypal";
  const manualActive = plan.status === "active" && !plan.provider;
  const showButtons = !manualActive && (!paidWithPaypal || plan.canceled);

  useEffect(() => {
    if (!showButtons || !user || !buttonsRef.current || !CLIENT_ID || !PLAN_ID) return;
    const container = buttonsRef.current;
    let buttons: PaypalButtons | null = null;
    let cancelled = false;

    loadPaypalSdk()
      .then(() => {
        if (cancelled || !window.paypal) return;
        buttons = window.paypal.Buttons({
          style: { shape: "rect", layout: "vertical", label: "subscribe" },
          createSubscription: (_data: unknown, actions: PaypalActions) =>
            actions.subscription.create({ plan_id: PLAN_ID, custom_id: user.uid }),
          onApprove: async (data: { subscriptionID?: string }) => {
            setBusy(true);
            setNotice(null);
            try {
              const res = await fetch("/api/billing/paypal/activate", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${await user.getIdToken()}` },
                body: JSON.stringify({ subscriptionId: data.subscriptionID }),
              });
              const body = await res.json();
              if (!res.ok) throw new Error(body.error ?? "No se pudo activar el plan");
              onPlanChange(planState(body.plan as Plan));
              setNotice({ ok: true, text: "¡Listo! Tu plan está activo." });
            } catch (err) {
              setNotice({ ok: false, text: err instanceof Error ? err.message : "No se pudo activar el plan" });
            } finally {
              setBusy(false);
            }
          },
          onError: () => setNotice({ ok: false, text: "PayPal no pudo procesar el pago. Inténtalo de nuevo." }),
        });
        return buttons.render(container);
      })
      .catch(() => setNotice({ ok: false, text: "No se pudo cargar PayPal. Recarga la página." }));

    return () => {
      cancelled = true;
      buttons?.close?.().catch(() => {});
      container.innerHTML = "";
    };
  }, [showButtons, user, onPlanChange]);

  const cancel = async () => {
    if (!user || !confirm("¿Cancelar tu suscripción? PayPal dejará de cobrar y conservas el acceso hasta el fin del mes pagado.")) return;
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch("/api/billing/paypal/cancel", {
        method: "POST",
        headers: { Authorization: `Bearer ${await user.getIdToken()}` },
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "No se pudo cancelar");
      onPlanChange(planState(body.plan as Plan));
      setNotice({ ok: true, text: "Suscripción cancelada. No se harán más cobros." });
    } catch (err) {
      setNotice({ ok: false, text: err instanceof Error ? err.message : "No se pudo cancelar" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2 items-start">
      <div className="flex flex-col gap-3">
        {manualActive && <p className="text-gray-800">Tu plan está <b>activo</b>.</p>}

        {paidWithPaypal && !plan.canceled && (
          <>
            <p className="text-gray-800">
              Plan <b>activo</b> · {PLAN_PRICE_USD} USD al mes, pagado con PayPal.
            </p>
            {plan.paidUntil && (
              <p className="text-sm text-gray-600">Próximo cobro: {formatDate(plan.paidUntil)}.</p>
            )}
            {plan.paymentFailed && (
              <p className="text-sm rounded bg-amber-50 text-amber-900 border border-amber-200 p-3">
                El último cobro falló. PayPal lo va a reintentar; revisa tu método de pago en tu cuenta de PayPal.
              </p>
            )}
            <button
              onClick={cancel}
              disabled={busy}
              className="self-start text-sm text-red-600 border border-red-200 rounded px-3 py-1.5 disabled:opacity-50"
            >
              Cancelar suscripción
            </button>
          </>
        )}

        {paidWithPaypal && plan.canceled && plan.paidUntil && (
          <p className="text-gray-800">
            Cancelaste tu suscripción. Tienes acceso hasta el <b>{formatDate(plan.paidUntil)}</b>. Puedes volver a
            suscribirte cuando quieras.
          </p>
        )}

        {!manualActive && !paidWithPaypal && (
          <>
            <p className="text-3xl font-bold text-gray-900 tabular-nums">
              {PLAN_PRICE_USD} USD <span className="text-base font-normal text-gray-600">al mes</span>
            </p>
            <p className="text-gray-700">
              {plan.status === "trial"
                ? `Te quedan ${plan.daysLeft} días de prueba. Suscríbete ahora y el primer cobro se hace hoy.`
                : "Activa tu plan para seguir enviando notificaciones y usar las automatizaciones."}
            </p>
            <ul className="text-sm text-gray-600 list-disc pl-5">
              <li>Todas las funciones, sin límite de clientes ni notificaciones.</li>
              <li>Pagas con PayPal o con tarjeta. PayPal cobra solo cada mes.</li>
              <li>Cancelas cuando quieras desde aquí.</li>
            </ul>
          </>
        )}

        {notice && <p className={`text-sm ${notice.ok ? "text-green-700" : "text-red-600"}`}>{notice.text}</p>}
      </div>

      {showButtons && (
        <div className="flex flex-col gap-2">
          {!CLIENT_ID || !PLAN_ID ? (
            <p className="text-sm text-red-600">PayPal aún no está configurado.</p>
          ) : (
            <>
              <div ref={buttonsRef} className={busy ? "opacity-50 pointer-events-none" : ""} />
              {SANDBOX && (
                <p className="text-xs text-amber-700">Modo de pruebas de PayPal (Sandbox): no se cobra dinero real.</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
