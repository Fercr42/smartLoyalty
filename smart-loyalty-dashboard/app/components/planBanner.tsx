import type { PlanState } from "../lib/plan";

// Aviso del plan arriba del panel: prueba gratis, cobro fallido o plan vencido. "Activar plan" lleva a la sección Tu plan.

export default function PlanBanner({ plan }: { plan: PlanState }) {
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
            <b>Tu plan no está activo.</b> Tus clientes siguen viendo su tarjeta y los sellos siguen funcionando, pero no
            puedes enviar notificaciones ni usar automatizaciones.
          </>
        ) : failed ? (
          <>
            <b>El último cobro de PayPal falló.</b> PayPal lo va a reintentar; revisa tu método de pago.
          </>
        ) : (
          <>
            <b>Te {plan.daysLeft === 1 ? "queda 1 día" : `quedan ${plan.daysLeft} días`} de prueba gratis.</b> Todas las
            funciones están disponibles.
          </>
        )}
      </p>
      {!failed && (
        <a
          href="#plan"
          className={`text-sm font-semibold px-3 py-1.5 rounded ${expired ? "bg-red-700 text-white" : "bg-emerald-700 text-white"}`}
        >
          Activar plan
        </a>
      )}
    </div>
  );
}
