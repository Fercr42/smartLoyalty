"use client";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useI18n } from "../i18n/client";
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
  const { m, f, dateLocale, te } = useI18n();
  const t = m.billing;
  const formatDate = (ms: number) => new Date(ms).toLocaleDateString(dateLocale, { day: "numeric", month: "long", year: "numeric" });
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
              if (!res.ok) throw new Error(te(body.error) ?? t.activateFailed);
              onPlanChange(planState(body.plan as Plan));
              setNotice({ ok: true, text: t.activated });
            } catch (err) {
              setNotice({ ok: false, text: err instanceof Error ? err.message : t.activateFailed });
            } finally {
              setBusy(false);
            }
          },
          onError: () => setNotice({ ok: false, text: t.paypalError }),
        });
        return buttons.render(container);
      })
      .catch(() => setNotice({ ok: false, text: t.sdkError }));

    return () => {
      cancelled = true;
      buttons?.close?.().catch(() => {});
      container.innerHTML = "";
    };
  }, [showButtons, user, onPlanChange, t, te]);

  const cancel = async () => {
    if (!user || !confirm(t.confirmCancel)) return;
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch("/api/billing/paypal/cancel", {
        method: "POST",
        headers: { Authorization: `Bearer ${await user.getIdToken()}` },
      });
      const body = await res.json();
      if (!res.ok) throw new Error(te(body.error) ?? t.cancelFailed);
      onPlanChange(planState(body.plan as Plan));
      setNotice({ ok: true, text: t.canceled });
    } catch (err) {
      setNotice({ ok: false, text: err instanceof Error ? err.message : t.cancelFailed });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2 items-start">
      <div className="flex flex-col gap-3">
        {manualActive && <p className="text-gray-800 font-medium">{t.activeManual}</p>}

        {paidWithPaypal && !plan.canceled && (
          <>
            <p className="text-gray-800 font-medium">{f(t.activePaypal, { price: PLAN_PRICE_USD })}</p>
            {plan.paidUntil && (
              <p className="text-sm text-gray-600">{f(t.nextCharge, { date: formatDate(plan.paidUntil) })}</p>
            )}
            {plan.paymentFailed && (
              <p className="text-sm rounded bg-amber-50 text-amber-900 border border-amber-200 p-3">
                {t.failedNote}
              </p>
            )}
            <button
              onClick={cancel}
              disabled={busy}
              className="self-start text-sm text-red-600 border border-red-200 rounded px-3 py-1.5 disabled:opacity-50"
            >
              {t.cancel}
            </button>
          </>
        )}

        {paidWithPaypal && plan.canceled && plan.paidUntil && (
          <p className="text-gray-800">{f(t.canceledUntil, { date: formatDate(plan.paidUntil) })}</p>
        )}

        {!manualActive && !paidWithPaypal && (
          <>
            <p className="text-3xl font-bold text-gray-900 tabular-nums">
              {PLAN_PRICE_USD} USD <span className="text-base font-normal text-gray-600">{t.perMonth}</span>
            </p>
            <p className="text-gray-700">
              {plan.status === "trial"
                ? f(t.trialLeft, { days: plan.daysLeft })
                : t.activatePrompt}
            </p>
            <ul className="text-sm text-gray-600 list-disc pl-5">
              <li>{t.point1}</li>
              <li>{t.point2}</li>
              <li>{t.point3}</li>
            </ul>
          </>
        )}

        {notice && <p className={`text-sm ${notice.ok ? "text-green-700" : "text-red-600"}`}>{notice.text}</p>}
      </div>

      {showButtons && (
        <div className="flex flex-col gap-2">
          {!CLIENT_ID || !PLAN_ID ? (
            <p className="text-sm text-red-600">{t.notConfigured}</p>
          ) : (
            <>
              <div ref={buttonsRef} className={busy ? "opacity-50 pointer-events-none" : ""} />
              {SANDBOX && (
                <p className="text-xs text-amber-700">{t.sandbox}</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
