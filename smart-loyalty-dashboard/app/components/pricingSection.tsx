"use client";
import { useState } from "react";
import { useI18n } from "../i18n/client";
import type { Period } from "../lib/plan";
import PlanCards from "./planCards";

// Precios en la página principal: los tres planes, mensual o anual.
export default function PricingSection() {
  const { m } = useI18n();
  const [period, setPeriod] = useState<Period>("month");
  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-2">
        {(["month", "year"] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPeriod(p)}
            className={`px-3 py-1.5 rounded-full text-sm border ${
              period === p ? "bg-[#19c58a] text-[#07201b] border-[#19c58a] font-semibold" : "border-white/20 text-white/80 hover:bg-white/10"
            }`}
          >
            {p === "month" ? m.plansInfo.monthly : m.plansInfo.annual}
          </button>
        ))}
      </div>
      <PlanCards period={period} dark />
      <p className="text-xs text-white/55">{m.landing.pricingNote}</p>
    </div>
  );
}
