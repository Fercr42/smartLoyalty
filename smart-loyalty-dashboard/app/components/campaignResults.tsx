"use client";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { campaignAudience } from "../lib/notification-labels";

type Campaign = {
  id: string;
  title: string;
  kind: string | null;
  audience: string;
  sentAt: number;
  pushSent: number;
  wallet: string;
  views: number;
  pushViews: number;
  walletViews: number;
  recipientCount: number | null;
  returned: number | null;
  visits: number | null;
  coupon: { title: string; redemptions: number } | null;
  inProgress: boolean;
};

const BAR = "#0e7c66";
const pct = (part: number, total: number) => (total > 0 ? Math.round((part / total) * 100) : 0);
const formatDate = (ms: number) => new Date(ms).toLocaleDateString("es", { day: "numeric", month: "short" });

export default function CampaignResults() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null);
  const [windowDays, setWindowDays] = useState(7);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch("/api/campaigns", { headers: { Authorization: `Bearer ${await user.getIdToken()}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudieron cargar los resultados");
      setCampaigns(data.campaigns);
      setWindowDays(data.windowDays);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron cargar los resultados");
    }
  }, [user]);

  useEffect(() => {
    load().catch(console.error);
  }, [load]);

  if (error && !campaigns) return <p className="text-sm text-red-600">{error}</p>;
  if (!campaigns) return <p className="text-sm text-gray-500">Cargando resultados...</p>;
  if (!campaigns.length) {
    return <p className="text-sm text-gray-500">Todavía no has enviado mensajes. Cuando envíes uno, aquí verás cómo le fue.</p>;
  }

  const measured = campaigns.filter((c) => c.returned !== null && c.recipientCount);
  const best = measured
    .filter((c) => !c.inProgress || (c.returned ?? 0) > 0)
    .sort((a, b) => pct(b.returned ?? 0, b.recipientCount ?? 0) - pct(a.returned ?? 0, a.recipientCount ?? 0))[0];
  const totals = measured.reduce(
    (acc, c) => ({ reached: acc.reached + (c.recipientCount ?? 0), returned: acc.returned + (c.returned ?? 0), visits: acc.visits + (c.visits ?? 0) }),
    { reached: 0, returned: 0, visits: 0 }
  );
  const couponsUsed = campaigns.reduce((sum, c) => sum + (c.coupon?.redemptions ?? 0), 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-600">
          Últimas {campaigns.length} campañas. &quot;Volvieron&quot; = clientes que recibieron el mensaje y sumaron un sello en los{" "}
          {windowDays} días siguientes.
        </p>
        <button onClick={() => load().catch(console.error)} className="border px-3 py-1.5 rounded text-sm hover:bg-gray-100">
          Actualizar
        </button>
      </div>

      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Tile label="Clientes alcanzados" value={totals.reached} note="en campañas medidas" />
        <Tile label="Volvieron" value={totals.returned} note={`${pct(totals.returned, totals.reached)}% de los alcanzados`} />
        <Tile label="Visitas generadas" value={totals.visits} note={`en ${windowDays} días tras cada envío`} />
        <Tile label="Cupones usados" value={couponsUsed} note="de campañas con cupón" />
      </dl>

      {best && (best.returned ?? 0) > 0 && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <b>Campaña con más regreso:</b> &quot;{best.title}&quot; — volvieron {best.returned} de {best.recipientCount} clientes (
          {pct(best.returned ?? 0, best.recipientCount ?? 0)}%).
        </div>
      )}

      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b bg-gray-50">
              <th className="px-3 py-2 font-medium">Campaña</th>
              <th className="px-3 py-2 font-medium text-right">Alcance</th>
              <th className="px-3 py-2 font-medium text-right">Aperturas</th>
              <th className="px-3 py-2 font-medium">Cupón</th>
              <th className="px-3 py-2 font-medium">Volvieron</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {campaigns.map((c) => {
              const returnRate = pct(c.returned ?? 0, c.recipientCount ?? 0);
              return (
                <tr key={c.id} className="align-top">
                  <td className="px-3 py-3">
                    <p className="font-medium text-gray-900">{c.title}</p>
                    <p className="text-xs text-gray-500">
                      {formatDate(c.sentAt)} · {campaignAudience(c.kind ?? undefined, c.audience)}
                    </p>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {c.recipientCount ?? c.pushSent}
                    <p className="text-xs text-gray-500">
                      {c.pushSent} navegador{c.wallet === "ok" ? " + Wallet" : ""}
                    </p>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {c.views}
                    <p className="text-xs text-gray-500">
                      {c.pushViews} navegador · {c.walletViews} Wallet
                    </p>
                  </td>
                  <td className="px-3 py-3">
                    {c.coupon ? (
                      <>
                        <span className="tabular-nums font-medium text-gray-900">{c.coupon.redemptions} usados</span>
                        <p className="text-xs text-gray-500 truncate max-w-[10rem]">{c.coupon.title}</p>
                      </>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3 min-w-[12rem]">
                    {c.returned === null ? (
                      <span className="text-xs text-gray-400">No medido (enviada antes de esta función)</span>
                    ) : (
                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between gap-2 tabular-nums">
                          <span className="font-medium text-gray-900">
                            {c.returned} de {c.recipientCount} ({returnRate}%)
                          </span>
                          <span className="text-xs text-gray-500">{c.visits} visitas</span>
                        </div>
                        <div className="h-2 rounded-full bg-gray-100 overflow-hidden" aria-hidden>
                          <div className="h-full rounded-full" style={{ width: `${returnRate}%`, background: BAR }} />
                        </div>
                        {c.inProgress && <span className="text-xs text-amber-700">Midiendo: faltan días de la ventana</span>}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-500">
        Solo cuentan las visitas con sello en el escáner. Las aperturas en Google Wallet se miden cuando el cliente toca el
        enlace de la promo en su tarjeta.
      </p>
    </div>
  );
}

function Tile({ label, value, note }: { label: string; value: number; note: string }) {
  return (
    <div className="border rounded-lg p-3">
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="text-2xl font-semibold text-gray-900 tabular-nums">{value}</dd>
      <dd className="text-xs text-gray-500">{note}</dd>
    </div>
  );
}
