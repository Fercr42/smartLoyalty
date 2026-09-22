"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useI18n } from "../i18n/client";
import { formatPoints } from "../lib/rewards";

type Customer = {
  code: string;
  name: string;
  points: number;
  visits: number;
  lastVisit: number | null;
  since: number | null;
  email: string;
  birthday: string;
  wallet: boolean;
  push: boolean;
};

const SHOW = 200;

// Quiénes tienen la tarjeta del negocio. companyId: solo lo usa el administrador (solo lectura).
export default function CustomersList({ companyId }: { companyId?: string }) {
  const { user } = useAuth();
  const { m, f, locale, dateLocale, te } = useI18n();
  const t = m.customers;
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const query = companyId ? `?companyId=${companyId}` : "";
      const res = await fetch(`/api/members${query}`, { headers: { Authorization: `Bearer ${await user.getIdToken()}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(te(data.error) ?? t.loadError);
      setCustomers(data.members);
      setTotal(data.total);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : t.loadError);
    }
  }, [user, companyId, te, t]);

  useEffect(() => {
    load().catch(console.error);
  }, [load]);

  const filtered = useMemo(() => {
    if (!customers) return [];
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => [c.name, c.code, c.email].some((v) => v.toLowerCase().includes(q)));
  }, [customers, search]);

  const day = (ms: number | null) => (ms ? new Date(ms).toLocaleDateString(dateLocale, { day: "numeric", month: "short" }) : t.never);
  const birthday = (mmdd: string) => {
    const [month, dayOfMonth] = mmdd.split("-").map(Number);
    return new Date(2024, month - 1, dayOfMonth).toLocaleDateString(dateLocale, { day: "numeric", month: "short" });
  };

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!customers) return <p className="text-sm text-gray-500">{m.common.loading}</p>;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-gray-900 tabular-nums">{f(t.count, { count: formatPoints(total, locale) })}</p>
        <input
          id="customers-search"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t.search}
          aria-label={t.search}
          className="border rounded-lg p-2 text-sm w-full sm:w-72"
        />
      </div>
      <p className="text-xs text-gray-500 -mt-2">{t.namesHint}</p>

      {customers.length === 0 ? (
        <p className="text-sm text-gray-500">{t.empty}</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-500">{t.noResults}</p>
      ) : (
        <>
          <div className="hidden sm:grid grid-cols-[minmax(0,1fr)_5rem_4.5rem_6.5rem] gap-3 px-3 text-xs font-medium text-gray-500">
            <span>{t.name}</span>
            <span className="text-right">{t.points}</span>
            <span className="text-right">{t.visits}</span>
            <span className="text-right">{t.lastVisit}</span>
          </div>
          <ul className="divide-y border rounded-lg -mt-2">
            {filtered.slice(0, SHOW).map((c) => (
              <li
                key={c.code}
                className="grid grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[minmax(0,1fr)_5rem_4.5rem_6.5rem] gap-x-3 gap-y-1 p-3 text-sm items-baseline"
              >
                <div className="min-w-0">
                  <p className={`font-semibold truncate ${c.name ? "text-gray-900" : "text-gray-400 italic font-normal"}`}>
                    {c.name || t.noName} <span className="font-mono text-xs font-normal not-italic text-gray-400">#{c.code}</span>
                  </p>
                  <p className="text-xs text-gray-500 flex flex-wrap gap-x-2 gap-y-0.5">
                    {c.email && <span className="truncate max-w-full">{c.email}</span>}
                    {c.birthday && <span>{f(t.birthday, { date: birthday(c.birthday) })}</span>}
                    {c.wallet && <span className="rounded bg-gray-100 px-1.5 text-gray-700">{t.wallet}</span>}
                    {c.push && <span className="rounded bg-blue-50 px-1.5 text-blue-800">{t.push}</span>}
                  </p>
                </div>
                <span className="text-right font-semibold tabular-nums text-gray-900">
                  {formatPoints(c.points, locale)}
                  <span className="sm:hidden font-normal text-xs text-gray-500"> {t.points.toLowerCase()}</span>
                </span>
                <span className="text-xs text-gray-500 sm:text-sm sm:text-right tabular-nums">
                  <span className="sm:hidden">{t.visits}: </span>
                  {c.visits}
                </span>
                <span className="text-xs text-gray-500 text-right sm:text-sm tabular-nums">{day(c.lastVisit)}</span>
              </li>
            ))}
          </ul>
          {filtered.length > SHOW && (
            <p className="text-xs text-gray-500">{f(t.showing, { shown: SHOW, count: formatPoints(filtered.length, locale) })}</p>
          )}
        </>
      )}
    </div>
  );
}
