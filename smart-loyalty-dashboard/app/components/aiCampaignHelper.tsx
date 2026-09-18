"use client";
import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useI18n } from "../i18n/client";
import type { CampaignDraft } from "../lib/ai-context";


// El dueño escribe su objetivo; la IA propone 3 notificaciones y "Usar esta" llena el formulario.
export default function AiCampaignHelper({ onUse }: { onUse: (draft: CampaignDraft) => void }) {
  const { user } = useAuth();
  const { m, f, dateLocale, te } = useI18n();
  const t = m.ai;
  const formatWhen = (local: string | null) =>
    local ? new Date(local).toLocaleString(dateLocale, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : t.sendNow;
  const [goal, setGoal] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [drafts, setDrafts] = useState<CampaignDraft[]>([]);

  const generate = async () => {
    if (!user || goal.trim().length < 5) {
      setError(t.goalRequired);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/ai/campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${await user.getIdToken()}` },
        body: JSON.stringify({ goal }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(te(data.error) ?? t.failed);
      setDrafts(data.drafts);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.failed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-xl border border-violet-200 bg-violet-50/60 p-4 flex flex-col gap-3">
      <div>
        <h3 className="font-semibold text-gray-900">{t.title}</h3>
        <p className="text-sm text-gray-600">
          {t.lead}
        </p>
      </div>
      <textarea
        id="ai-goal"
        value={goal}
        maxLength={400}
        rows={2}
        onChange={(e) => setGoal(e.target.value)}
        placeholder={t.placeholder}
        className="border p-2 rounded bg-white"
      />
      <div className="flex flex-wrap items-center gap-2">
        {t.examples.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => setGoal(example)}
            className="text-xs rounded-full border bg-white px-3 py-2 text-gray-700 hover:bg-gray-100"
          >
            {example}
          </button>
        ))}
        <button
          type="button"
          onClick={generate}
          disabled={loading}
          className="ml-auto bg-violet-700 text-white px-4 py-2 rounded text-sm disabled:opacity-50"
        >
          {loading ? t.thinking : drafts.length ? t.again : t.create}
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}

      {drafts.length > 0 && (
        <ul className="grid gap-3 md:grid-cols-3">
          {drafts.map((d, i) => (
            <li key={i} className="rounded-lg border bg-white p-3 flex flex-col gap-2 text-sm">
              <p className="text-xs uppercase tracking-wide text-violet-700 font-medium">{d.name}</p>
              <div>
                <p className="font-semibold text-gray-900">{d.title}</p>
                <p className="text-gray-700">{d.body}</p>
              </div>
              <p className="text-xs text-gray-500">
                {m.labels.audiences[d.audience]} · {formatWhen(d.sendAt)}
                {d.coupon ? ` · ${f(t.coupon, { title: d.coupon.title, days: d.coupon.days })}` : ""}
              </p>
              <p className="text-xs text-gray-600 italic">{d.why}</p>
              <button
                type="button"
                onClick={() => onUse(d)}
                className="mt-auto self-start border border-violet-300 text-violet-800 rounded px-3 py-1.5 hover:bg-violet-50"
              >
                {t.use}
              </button>
            </li>
          ))}
        </ul>
      )}
      {drafts.length > 0 && (
        <p className="text-xs text-gray-500">{t.review}</p>
      )}
    </section>
  );
}
