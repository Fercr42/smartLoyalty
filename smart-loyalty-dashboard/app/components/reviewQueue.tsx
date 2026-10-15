"use client";
import { useCallback, useEffect, useState } from "react";
import { collection, doc, getDoc, getDocs, limit, orderBy, query, where, type Timestamp } from "firebase/firestore";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../firebase/config";
import { useI18n } from "../i18n/client";

// Panel del dueño: encuestas de reseña programadas (¿van a salir?) y las últimas enviadas (¿llegaron?).

type Job = { id: string; sendAt: number; attempts: number; memberIds: string[] };
type Sent = { id: string; at: number; sent: number; reached: number };

export default function ReviewQueue() {
  const { user } = useAuth();
  const { m, f, dateLocale } = useI18n();
  const t = m.reviewQueue;
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [sent, setSent] = useState<Sent[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [now, setNow] = useState(0);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  const time = (ms: number) => new Date(ms).toLocaleString(dateLocale, { dateStyle: "medium", timeStyle: "short" });
  const refresh = useCallback(() => setReload((n) => n + 1), []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const [jobsSnap, sentSnap] = await Promise.all([
          getDocs(query(collection(db, "scheduledJobs"), where("companyId", "==", user.uid))),
          getDocs(query(collection(db, "companies", user.uid, "notifications"), orderBy("createdAt", "desc"), limit(40))),
        ]);
        const reviewJobs = jobsSnap.docs
          .filter((d) => d.data().payload?.kind === "review")
          .map((d) => ({
            id: d.id,
            sendAt: (d.data().sendAt as Timestamp).toMillis(),
            attempts: d.data().attempts ?? 0,
            memberIds: (d.data().payload?.memberIds ?? []) as string[],
          }))
          .sort((a, b) => a.sendAt - b.sendAt);
        // Nombres solo de los clientes con encuesta programada (no de todos los clientes).
        const ids = [...new Set(reviewJobs.flatMap((j) => j.memberIds))].slice(0, 30);
        const members = await Promise.all(ids.map((id) => getDoc(doc(db, "companies", user.uid, "walletMembers", id))));
        if (cancelled) return;
        setJobs(reviewJobs);
        setSent(
          sentSnap.docs
            .filter((d) => d.data().kind === "review")
            .slice(0, 10)
            .map((d) => ({
              id: d.id,
              at: (d.data().createdAt as Timestamp | undefined)?.toMillis() ?? 0,
              sent: d.data().sent ?? 0,
              reached: d.data().recipientCount ?? 0,
            }))
        );
        setNames(Object.fromEntries(members.map((d) => [d.id, (d.data()?.name as string) || ""])));
        setNow(Date.now());
        setError("");
      } catch (e) {
        console.error(e);
        if (!cancelled) setError(t.loadError);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, reload, t.loadError]);

  const who = (ids: string[]) =>
    ids.map((id) => names[id] || id.slice(0, 8).toUpperCase()).slice(0, 3).join(", ") + (ids.length > 3 ? ` +${ids.length - 3}` : "");

  const status = (job: Job) => {
    if (job.attempts > 0) return { text: t.retrying, tone: "text-amber-700" };
    const diff = job.sendAt - now;
    const min = Math.max(1, Math.round(Math.abs(diff) / 60_000));
    return diff > 0 ? { text: f(t.sendsIn, { min }), tone: "text-sky-700" } : { text: f(t.late, { min }), tone: "text-amber-700" };
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm text-gray-600 max-w-xl">{t.lead}</p>
        <button onClick={refresh} className="text-sm border rounded-md px-3 py-1 hover:bg-gray-50">
          {t.refresh}
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div>
        <h3 className="font-semibold text-gray-900 mb-2">{t.scheduled}</h3>
        {jobs && jobs.length === 0 && <p className="text-sm text-gray-600">{t.none}</p>}
        {jobs && jobs.length > 0 && (
          <ul className="divide-y text-sm">
            {jobs.map((job) => {
              const s = status(job);
              return (
                <li key={job.id} className="py-2 flex flex-wrap justify-between gap-x-4 gap-y-1">
                  <span className="font-medium text-gray-900">{who(job.memberIds)}</span>
                  <span className="text-gray-600 tabular-nums">{time(job.sendAt)}</span>
                  <span className={s.tone}>{s.text}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div>
        <h3 className="font-semibold text-gray-900 mb-2">{t.sent}</h3>
        {sent.length === 0 ? (
          <p className="text-sm text-gray-600">{t.noneSent}</p>
        ) : (
          <ul className="divide-y text-sm">
            {sent.map((s) => (
              <li key={s.id} className="py-2 flex flex-wrap justify-between gap-x-4 gap-y-1">
                <span className="text-gray-600 tabular-nums">{s.at ? time(s.at) : "—"}</span>
                <span className={s.sent || s.reached ? "text-green-700" : "text-amber-700"}>
                  {s.sent ? (s.sent === 1 ? t.reachedOne : f(t.reachedMany, { count: s.sent })) : s.reached ? t.wallet : t.notReached}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
