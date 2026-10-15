"use client";
import { useCallback, useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { formatColones } from "../lib/format-money";

// Administrador: pagos por SINPE Móvil por revisar. Se aprueban después de verlos en el banco.

type Payment = {
  id: string;
  companyId: string;
  companyName: string;
  ownerEmail: string;
  tier: string;
  period: string;
  amountCrc: number;
  reference: string;
  receipt: string;
  createdAt: number | null;
};

const TIER: Record<string, string> = { esencial: "Esencial", pro: "Pro", multi: "Multi-local" };

export default function SinpeReview({ user, onChange }: { user: User; onChange: () => void }) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/sinpe", { headers: { Authorization: `Bearer ${await user.getIdToken()}` } });
    const body = await res.json();
    if (res.ok) setPayments(body.payments);
    else setError(body.error ?? "No se pudieron cargar los pagos");
  }, [user]);

  useEffect(() => {
    load().catch(console.error);
  }, [load]);

  const review = async (p: Payment, action: "approve" | "reject") => {
    let note = "";
    if (action === "approve") {
      if (!confirm(`¿Ya viste en tu banco el SINPE de ${formatColones(p.amountCrc)} con comprobante ${p.receipt}?`)) return;
    } else {
      const reason = prompt("Motivo del rechazo (le llega al dueño por correo):", "No encontramos el pago con ese comprobante.");
      if (reason === null) return;
      note = reason;
    }
    setBusy(p.id);
    setError("");
    try {
      const res = await fetch("/api/admin/sinpe", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${await user.getIdToken()}` },
        body: JSON.stringify({ id: p.id, action, note }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "No se pudo guardar");
      await load();
      onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setBusy("");
    }
  };

  if (!payments.length && !error) return null;

  return (
    <section className="bg-white border border-amber-200 rounded-xl p-4 flex flex-col gap-3">
      <h2 className="font-semibold text-gray-900">Pagos por SINPE por revisar ({payments.length})</h2>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b">
              <th className="py-2 pr-3 font-medium">Negocio</th>
              <th className="py-2 pr-3 font-medium">Plan</th>
              <th className="py-2 pr-3 font-medium text-right">Monto</th>
              <th className="py-2 pr-3 font-medium">Referencia</th>
              <th className="py-2 pr-3 font-medium">Comprobante</th>
              <th className="py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {payments.map((p) => (
              <tr key={p.id}>
                <td className="py-2 pr-3">
                  <p className="font-medium">{p.companyName || p.companyId}</p>
                  <p className="text-xs text-gray-500">
                    {p.ownerEmail} · {p.createdAt ? new Date(p.createdAt).toLocaleString("es-CR") : ""}
                  </p>
                </td>
                <td className="py-2 pr-3">
                  {TIER[p.tier] ?? p.tier} · {p.period === "year" ? "anual" : "mensual"}
                </td>
                <td className="py-2 pr-3 text-right tabular-nums">{formatColones(p.amountCrc)}</td>
                <td className="py-2 pr-3 font-mono">{p.reference}</td>
                <td className="py-2 pr-3 font-mono">{p.receipt}</td>
                <td className="py-2 flex gap-2 justify-end">
                  <button
                    onClick={() => review(p, "approve")}
                    disabled={busy === p.id}
                    className="bg-emerald-600 text-white rounded px-3 py-1.5 disabled:opacity-50"
                  >
                    Aprobar
                  </button>
                  <button
                    onClick={() => review(p, "reject")}
                    disabled={busy === p.id}
                    className="border border-red-200 text-red-700 rounded px-3 py-1.5 disabled:opacity-50"
                  >
                    Rechazar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
