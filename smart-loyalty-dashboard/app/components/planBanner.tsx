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
      className={`rounded-2xl border px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 border-l-4 ${
        expired
          ? "bg-[#fff4f2] border-[#f3c9c1] border-l-[#d9452b] text-[#6b1d10]"
          : failed
            ? "bg-[#fff8e8] border-[#f5dfa6] border-l-[#f2b134] text-[#5c4108]"
            : "bg-[#07201b] border-[#07201b] border-l-[#19c58a] text-white/85"
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
          className={`sl-press text-sm font-semibold px-4 py-2 rounded-xl ${expired ? "bg-[#d9452b] text-white" : "bg-[#19c58a] text-[#07201b]"}`}
        >
          {t.activate}
        </a>
      )}
    </div>
  );
}
