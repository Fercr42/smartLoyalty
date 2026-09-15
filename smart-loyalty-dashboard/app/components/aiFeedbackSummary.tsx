"use client";
import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import type { FeedbackSummary } from "../lib/ai-context";

type Summary = FeedbackSummary & { generatedAt: number | null; count: number; average: number };

const LISTS = [
  { key: "positives", label: "Lo que más gusta", tone: "text-green-800" },
  { key: "problems", label: "Quejas que se repiten", tone: "text-red-700" },
  { key: "actions", label: "Qué hacer esta semana", tone: "text-gray-900" },
] as const;

// Resumen de las opiniones de la encuesta hecho por la IA.
export default function AiFeedbackSummary() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    user
      .getIdToken()
      .then((token) => fetch("/api/ai/feedback", { headers: { Authorization: `Bearer ${token}` } }))
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data?.summary && setSummary(data.summary))
      .catch(() => {});
  }, [user]);

  const generate = async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/ai/feedback", {
        method: "POST",
        headers: { Authorization: `Bearer ${await user.getIdToken()}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo crear el resumen");
      setSummary(data.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el resumen");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border border-violet-200 bg-violet-50/60 p-3 flex flex-col gap-2 text-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold text-gray-900">Resumen con IA</p>
        <button
          type="button"
          onClick={generate}
          disabled={loading}
          className="bg-violet-700 text-white px-3 py-1.5 rounded text-sm disabled:opacity-50 whitespace-nowrap"
        >
          {loading ? "Leyendo opiniones..." : summary ? "Actualizar" : "Resumir opiniones"}
        </button>
      </div>
      {error && <p className="text-red-600">{error}</p>}
      {!summary && !error && (
        <p className="text-gray-600">La IA lee las opiniones de los últimos 90 días y te dice qué gusta, qué falla y qué hacer.</p>
      )}
      {summary && (
        <>
          <p className="text-gray-800">{summary.summary}</p>
          {LISTS.map(({ key, label, tone }) =>
            summary[key].length ? (
              <div key={key}>
                <p className={`text-xs uppercase tracking-wide font-medium ${tone}`}>{label}</p>
                <ul className="list-disc pl-5 text-gray-700">
                  {summary[key].map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null
          )}
          <p className="text-xs text-gray-500 tabular-nums">
            {summary.count} opiniones · {summary.average.toFixed(1)} ★
            {summary.generatedAt
              ? ` · ${new Date(summary.generatedAt).toLocaleDateString("es", { day: "numeric", month: "short" })}`
              : ""}
          </p>
        </>
      )}
    </div>
  );
}
