"use client";
import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";

// Administrador: volver a habilitar la encuesta de reseña de un cliente (para probar).
export default function ReviewReset({ companyId }: { companyId: string }) {
  const { user } = useAuth();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/review-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${await user.getIdToken()}` },
        body: JSON.stringify({ companyId, code }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "No se pudo reiniciar");
      setNotice({ ok: true, text: `Listo: a ${body.code} se le pedirá la reseña en su próxima compra.` });
      setCode("");
    } catch (err) {
      setNotice({ ok: false, text: err instanceof Error ? err.message : "No se pudo reiniciar" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="bg-white border rounded-xl p-5 flex flex-col gap-2">
      <h3 className="font-semibold text-gray-900">Reiniciar encuesta de reseña</h3>
      <p className="text-sm text-gray-600">
        Escribe el código de 8 caracteres de la tarjeta del cliente. En su próxima compra se le volverá a pedir la reseña.
      </p>
      <div className="flex flex-wrap gap-2">
        <label htmlFor="review-reset-code" className="sr-only">
          Código de la tarjeta
        </label>
        <input
          id="review-reset-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Ej. 3F9A12BC"
          maxLength={8}
          className="border rounded p-2 font-mono uppercase w-40"
        />
        <button disabled={busy || code.trim().length !== 8} className="bg-gray-900 text-white rounded px-4 py-2 disabled:opacity-50">
          {busy ? "Reiniciando..." : "Reiniciar"}
        </button>
      </div>
      {notice && <p className={`text-sm ${notice.ok ? "text-green-700" : "text-red-600"}`}>{notice.text}</p>}
    </form>
  );
}
