import type { PlanState } from "../lib/plan";

// Aviso de prueba gratis en el panel. El enlace para activar el plan se configura con NEXT_PUBLIC_SALES_CONTACT_URL.
const CONTACT_URL = process.env.NEXT_PUBLIC_SALES_CONTACT_URL;

export default function PlanBanner({ plan }: { plan: PlanState }) {
  if (plan.status === "active" || plan.status === "none") return null;
  const expired = plan.status === "expired";

  return (
    <div
      role="status"
      className={`rounded-lg border px-4 py-3 flex flex-wrap items-center justify-between gap-3 ${
        expired ? "bg-red-50 border-red-200 text-red-900" : "bg-emerald-50 border-emerald-200 text-emerald-900"
      }`}
    >
      <p className="text-sm">
        {expired ? (
          <>
            <b>Tu prueba gratis terminó.</b> Tus clientes siguen viendo su tarjeta y los sellos siguen funcionando, pero no
            puedes enviar notificaciones ni usar automatizaciones.
          </>
        ) : (
          <>
            <b>
              Te {plan.daysLeft === 1 ? "queda 1 día" : `quedan ${plan.daysLeft} días`} de prueba gratis.
            </b>{" "}
            Todas las funciones están disponibles.
          </>
        )}
      </p>
      {CONTACT_URL && (
        <a
          href={CONTACT_URL}
          target="_blank"
          className={`text-sm font-semibold px-3 py-1.5 rounded ${
            expired ? "bg-red-700 text-white" : "bg-emerald-700 text-white"
          }`}
        >
          Activar plan
        </a>
      )}
    </div>
  );
}
