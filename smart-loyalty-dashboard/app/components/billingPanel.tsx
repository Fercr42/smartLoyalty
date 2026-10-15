"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useI18n } from "../i18n/client";
import { formatColones } from "../lib/format-money";
import { PLANS, planState, priceCrc, type Period, type Plan, type PlanState, type Tier } from "../lib/plan";
import PlanCards from "./planCards";

// "Tu plan": elegir Esencial, Pro o Multi-local y pagar con SINPE Móvil (mensual o anual) o PayPal (mensual).

const CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ?? "";
const PAYPAL_PLANS: Record<Tier, string> = {
  esencial: process.env.NEXT_PUBLIC_PAYPAL_PLAN_ESENCIAL ?? "",
  pro: process.env.NEXT_PUBLIC_PAYPAL_PLAN_PRO ?? "",
  multi: process.env.NEXT_PUBLIC_PAYPAL_PLAN_MULTI ?? "",
};
const SANDBOX = process.env.NEXT_PUBLIC_PAYPAL_ENV !== "live";

type PaypalButtons = { render: (el: HTMLElement) => Promise<void>; close?: () => Promise<void> };
type PaypalActions = { subscription: { create: (options: Record<string, unknown>) => Promise<string> } };
declare global {
  interface Window {
    paypal?: { Buttons: (options: Record<string, unknown>) => PaypalButtons };
  }
}

type SinpeInfo =
  | { enabled: false }
  | {
      enabled: true;
      phone: string;
      name: string;
      reference: string;
      pending: { tier: Tier; period: Period; amountCrc: number; receipt: string } | null;
    };

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
  const names = m.plansInfo.names;
  const formatDate = (ms: number) => new Date(ms).toLocaleDateString(dateLocale, { day: "numeric", month: "long", year: "numeric" });
  const buttonsRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [tier, setTier] = useState<Tier>(plan.status === "active" ? plan.tier : "pro");
  const [period, setPeriod] = useState<Period>("month");
  const [method, setMethod] = useState<"sinpe" | "paypal">("sinpe");
  const [sinpe, setSinpe] = useState<SinpeInfo | null>(null);
  const [receipt, setReceipt] = useState("");
  const [renewing, setRenewing] = useState(false);

  const paidWithPaypal = plan.status === "active" && plan.provider === "paypal";
  const paidWithSinpe = plan.status === "active" && plan.provider === "sinpe";
  const manualActive = plan.status === "active" && (!plan.provider || plan.provider === "manual");
  // Mostrar la elección de plan si no hay plan pagado, si PayPal se canceló o si quiere renovar por SINPE.
  const choosing = !manualActive && (!paidWithPaypal || plan.canceled) && (!paidWithSinpe || renewing);
  const paypalPlan = PAYPAL_PLANS[tier];
  const showPaypal = choosing && method === "paypal" && period === "month" && Boolean(CLIENT_ID && paypalPlan);

  const loadSinpe = useCallback(async () => {
    if (!user) return;
    const res = await fetch("/api/billing/sinpe", { headers: { Authorization: `Bearer ${await user.getIdToken()}` } });
    if (res.ok) setSinpe(await res.json());
  }, [user]);

  useEffect(() => {
    loadSinpe().catch(console.error);
  }, [loadSinpe]);

  useEffect(() => {
    if (!showPaypal || !user || !buttonsRef.current) return;
    const container = buttonsRef.current;
    let buttons: PaypalButtons | null = null;
    let cancelled = false;

    loadPaypalSdk()
      .then(() => {
        if (cancelled || !window.paypal) return;
        buttons = window.paypal.Buttons({
          style: { shape: "rect", layout: "vertical", label: "subscribe" },
          createSubscription: (_data: unknown, actions: PaypalActions) =>
            actions.subscription.create({ plan_id: paypalPlan, custom_id: user.uid }),
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
  }, [showPaypal, paypalPlan, user, onPlanChange, t, te]);

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

  const reportSinpe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch("/api/billing/sinpe", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${await user.getIdToken()}` },
        body: JSON.stringify({ tier, period, receipt }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(te(body.error) ?? t.sinpeFailed);
      setReceipt("");
      await loadSinpe();
    } catch (err) {
      setNotice({ ok: false, text: err instanceof Error ? err.message : t.sinpeFailed });
    } finally {
      setBusy(false);
    }
  };

  const pending = sinpe?.enabled ? sinpe.pending : null;
  const tab = (id: "sinpe" | "paypal", label: string) => (
    <button
      type="button"
      onClick={() => setMethod(id)}
      className={`px-3 py-1.5 rounded-full text-sm border ${method === id ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-700 hover:bg-gray-100"}`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Estado actual */}
      <div className="flex flex-col gap-2">
        {manualActive && <p className="text-gray-800 font-medium">{f(t.activeManual, { tier: names[plan.tier] })}</p>}

        {paidWithPaypal && !plan.canceled && (
          <>
            <p className="text-gray-800 font-medium">{f(t.activePaypal, { tier: names[plan.tier], price: PLANS[plan.tier].usd })}</p>
            {plan.paidUntil && <p className="text-sm text-gray-600">{f(t.nextCharge, { date: formatDate(plan.paidUntil) })}</p>}
            {plan.paymentFailed && (
              <p className="text-sm rounded bg-amber-50 text-amber-900 border border-amber-200 p-3">{t.failedNote}</p>
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

        {paidWithSinpe && plan.paidUntil && (
          <>
            <p className="text-gray-800 font-medium">{f(t.activeSinpe, { tier: names[plan.tier], date: formatDate(plan.paidUntil) })}</p>
            {!renewing && !pending && (
              <button onClick={() => setRenewing(true)} className="self-start text-sm border rounded px-3 py-1.5 hover:bg-gray-50">
                {t.renew}
              </button>
            )}
          </>
        )}

        {!plan.allowed && !pending && <p className="text-gray-700">{t.activatePrompt}</p>}
        {plan.status === "trial" && <p className="text-gray-700">{f(t.trialLeft, { days: plan.daysLeft })}</p>}

        {pending && (
          <p className="text-sm rounded bg-sky-50 text-sky-900 border border-sky-200 p-3">
            {f(t.sinpePending, { receipt: pending.receipt, amount: formatColones(pending.amountCrc), tier: names[pending.tier] })}
          </p>
        )}
        {notice && <p className={`text-sm ${notice.ok ? "text-green-700" : "text-red-600"}`}>{notice.text}</p>}
      </div>

      {/* Elegir plan y pagar */}
      {choosing && !pending && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-semibold text-gray-900">{t.choosePlan}</h3>
            <div className="flex gap-2">
              {(["month", "year"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 rounded-full text-sm border ${period === p ? "bg-[#0e7c66] text-white border-[#0e7c66]" : "bg-white text-gray-700 hover:bg-gray-100"}`}
                >
                  {p === "month" ? m.plansInfo.monthly : m.plansInfo.annual}
                </button>
              ))}
            </div>
          </div>
          <PlanCards period={period} selected={tier} onSelect={setTier} />
          {tier === "multi" && <p className="text-sm text-gray-600">{t.multiNote}</p>}

          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-700">{t.payWith}</span>
              {tab("sinpe", t.sinpe)}
              {tab("paypal", t.paypal)}
            </div>

            {method === "sinpe" &&
              (sinpe?.enabled ? (
                <form onSubmit={reportSinpe} className="rounded-xl border bg-gray-50 p-4 flex flex-col gap-2 max-w-xl">
                  <ol className="list-decimal pl-5 text-sm text-gray-800 flex flex-col gap-1">
                    <li>
                      <strong>{f(t.sinpeStep1, { amount: formatColones(priceCrc(tier, period)), phone: sinpe.phone })}</strong>
                      {sinpe.name && <> {f(t.sinpeName, { name: sinpe.name })}</>}
                    </li>
                    <li>{f(t.sinpeStep2, { reference: sinpe.reference })}</li>
                    <li>{t.sinpeStep3}</li>
                  </ol>
                  <div className="flex flex-wrap gap-2">
                    <label htmlFor="sinpe-receipt" className="sr-only">
                      {t.receipt}
                    </label>
                    <input
                      id="sinpe-receipt"
                      value={receipt}
                      onChange={(e) => setReceipt(e.target.value)}
                      placeholder={t.receipt}
                      inputMode="numeric"
                      maxLength={40}
                      required
                      className="border rounded p-2 flex-1 min-w-[12rem] bg-white"
                    />
                    <button disabled={busy || !receipt.trim()} className="bg-gray-900 text-white px-4 py-2 rounded disabled:opacity-50">
                      {busy ? t.sending : t.reportPaid}
                    </button>
                  </div>
                </form>
              ) : (
                sinpe && <p className="text-sm text-gray-600">{t.sinpeOff}</p>
              ))}

            {method === "paypal" &&
              (period === "year" ? (
                <p className="text-sm text-gray-600">{t.paypalAnnual}</p>
              ) : !CLIENT_ID || !paypalPlan ? (
                <p className="text-sm text-red-600">{t.notConfigured}</p>
              ) : (
                <div className="max-w-md flex flex-col gap-2">
                  <div ref={buttonsRef} className={busy ? "opacity-50 pointer-events-none" : ""} />
                  {SANDBOX && <p className="text-xs text-amber-700">{t.sandbox}</p>}
                </div>
              ))}
          </div>
        </>
      )}
    </div>
  );
}
