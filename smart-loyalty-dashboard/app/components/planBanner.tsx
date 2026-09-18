"use client";
import { useI18n } from "../i18n/client";
import type { PlanState } from "../lib/plan";

// Aviso del plan arriba del panel: prueba gratis, cobro fallido o plan vencido. "Activar plan" lleva a la sección Plan.

export default function PlanBanner({ plan }: { plan: PlanState }) {
  const { m, f } = useI18n();
  const t = m.planBanner;
  const expired = plan.status === "expired";
  const trial = plan.status === "trial";
  const failed = plan.status === "active" && plan.paymentFailed;
  if (!expired && !trial && !failed) return null;

  return (
    <div
      role="status"
      className={`rounded-lg border px-4 py-3 flex flex-wrap items-center justify-between gap-3 ${
        expired
          ? "bg-red-50 border-red-200 text-red-900"
          : failed
            ? "bg-amber-50 border-amber-200 text-amber-900"
            : "bg-emerald-50 border-emerald-200 text-emerald-900"
      }`}
    >
      <p className="text-sm">
        {expired ? (
          <>
            <b>{t.expiredTitle}</b> {t.expiredText}
          </>
        ) : failed ? (
          <>
            <b>{t.failedTitle}</b> {t.failedText}
          </>
        ) : (
          <>
            <b>{plan.daysLeft === 1 ? t.trialOne : f(t.trialMany, { days: plan.daysLeft })}</b> {t.trialText}
          </>
        )}
      </p>
      {!failed && (
        <a
          href="#plan"
          className={`text-sm font-semibold px-3 py-1.5 rounded ${expired ? "bg-red-700 text-white" : "bg-emerald-700 text-white"}`}
        >
          {t.activate}
        </a>
      )}
    </div>
  );
}
