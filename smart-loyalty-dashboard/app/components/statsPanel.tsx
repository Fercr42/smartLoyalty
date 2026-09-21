"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useI18n } from "../i18n/client";
import { cleanLoyalty } from "../lib/loyalty-mode";

type Stats = {
  days: number;
  members: number;
  newMembers: number;
  devices: number;
  events: { type: string; at: number; memberId: string; amount?: number; sale?: number }[];
  loyalty?: unknown;
  notifications: { count: number; sent: number; views: number; walletViews?: number };
  reviewClicks: number;
  feedback?: { count: number; average: number | null };
};
type Bar = { label: string; value: number; tooltip: string };

const BAR_COLOR = "#2563eb"; // una sola serie: un solo tono
const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const niceMax = (max: number) => (max <= 4 ? 4 : Math.ceil(max / 5) * 5);

// companyId: solo lo usa el administrador para ver los datos de un restaurante.
export default function StatsPanel({ companyId }: { companyId?: string }) {
  const { user } = useAuth();
  const { m, f, dateLocale, te } = useI18n();
  const t = m.stats;
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const query = companyId ? `?companyId=${companyId}` : "";
    const res = await fetch(`/api/stats${query}`, { headers: { Authorization: `Bearer ${await user.getIdToken()}` } });
    const data = await res.json();
    if (!res.ok) throw new Error(te(data.error) ?? t.loadError);
    setStats(data);
    setError("");
  }, [user, t, te, companyId]);

  useEffect(() => {
    load().catch((e) => setError(e instanceof Error ? e.message : t.loadError));
  }, [load, t]);

  // Agrupar en la zona horaria del dueño (la del navegador).
  const summary = useMemo(() => {
    if (!stats) return null;
    const stamps = stats.events.filter((e) => e.type === "stamp");
    const visitsByMember = new Map<string, number>();
    stamps.forEach((e) => visitsByMember.set(e.memberId, (visitsByMember.get(e.memberId) ?? 0) + 1));

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = Array.from({ length: stats.days }, (_, i) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (stats.days - 1 - i));
      return { date, count: 0 };
    });
    const dayIndex = new Map(days.map((d, i) => [dayKey(d.date), i]));
    const hours = Array.from({ length: 24 }, () => 0);
    stamps.forEach((e) => {
      const date = new Date(e.at);
      const i = dayIndex.get(dayKey(date));
      if (i !== undefined) days[i].count++;
      hours[date.getHours()]++;
    });

    const plural = (n: number) => f(n === 1 ? t.visitOne : t.visitMany, { count: n });
    const sales = stamps.filter((e) => (e.sale ?? 0) > 0);
    return {
      visits: stamps.length,
      visitors: visitsByMember.size,
      returning: [...visitsByMember.values()].filter((n) => n >= 2).length,
      redeems: stats.events.filter((e) => e.type === "redeem").length,
      sales: sales.reduce((sum, e) => sum + (e.sale ?? 0), 0),
      salesCount: sales.length,
      points: stamps.reduce((sum, e) => sum + (e.amount ?? 0), 0),
      coupons: stats.events.filter((e) => e.type === "coupon").length,
      byDay: days.map<Bar>((d) => {
        const label = d.date.toLocaleDateString(dateLocale, { day: "numeric", month: "short" });
        return { label, value: d.count, tooltip: `${label} · ${plural(d.count)}` };
      }),
      byHour: hours.map<Bar>((count, h) => ({
        label: `${h}h`,
        value: count,
        tooltip: `${f(t.hourRange, { hour: h })} · ${plural(count)}`,
      })),
    };
  }, [stats, f, t, dateLocale]);

  const exportMembers = async () => {
    if (!user) return;
    setExporting(true);
    try {
      const res = await fetch("/api/export/members", { headers: { Authorization: `Bearer ${await user.getIdToken()}` } });
      if (!res.ok) throw new Error();
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = `${t.exportFile}-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError(t.exportError);
    } finally {
      setExporting(false);
    }
  };

  if (error && !stats) return <p className="text-sm text-red-600">{error}</p>;
  if (!stats || !summary) return <p className="text-sm text-gray-500">{t.loading}</p>;

  const loyalty = cleanLoyalty(stats.loyalty);

  const tiles = [
    { label: t.members, value: stats.members, note: f(t.newMembers, { count: stats.newMembers }) },
    { label: t.visits, value: summary.visits, note: f(t.distinct, { count: summary.visitors }) },
    { label: t.returning, value: summary.returning, note: f(t.returningNote, { count: summary.visitors }) },
    ...(loyalty.mode === "points"
      ? [
          {
            label: t.sales,
            value: `${loyalty.currency}${summary.sales.toLocaleString(dateLocale)}`,
            note: f(t.salesNote, { count: summary.salesCount }),
          },
          {
            label: t.ticket,
            value: summary.salesCount ? `${loyalty.currency}${Math.round(summary.sales / summary.salesCount).toLocaleString(dateLocale)}` : "—",
            note: t.inDays,
          },
          { label: t.pointsGiven, value: summary.points.toLocaleString(dateLocale), note: t.inDays },
        ]
      : []),
    { label: t.redeems, value: summary.redeems, note: t.inDays },
    { label: t.coupons, value: summary.coupons, note: t.inDays },
    { label: t.devices, value: stats.devices, note: t.devicesNote },
    {
      label: t.opens,
      value: stats.notifications.views,
      note: f(t.opensNote, { wallet: stats.notifications.walletViews ?? 0, sent: stats.notifications.sent }),
    },
    {
      label: t.rating,
      value: stats.feedback?.average ? `${stats.feedback.average.toFixed(1)} ★` : "—",
      note: f(t.ratingNote, { count: stats.feedback?.count ?? 0, clicks: stats.reviewClicks }),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-600">{f(t.lastDays, { days: stats.days })}</p>
        <div className="flex gap-2">
          <button
            onClick={() => load().catch(console.error)}
            className="border px-3 py-1.5 rounded text-sm hover:bg-gray-100"
          >
            {m.common.refresh}
          </button>
          {!companyId && (
            <button
              onClick={exportMembers}
              disabled={exporting}
              className="bg-gray-900 text-white px-3 py-1.5 rounded text-sm disabled:opacity-50"
            >
              {exporting ? t.exporting : t.export}
            </button>
          )}
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {tiles.map((tile) => (
          <div key={tile.label} className="border rounded-lg p-3">
            <dt className="text-xs text-gray-500">{tile.label}</dt>
            <dd className="text-2xl font-semibold text-gray-900 tabular-nums">{tile.value}</dd>
            <dd className="text-xs text-gray-500">{tile.note}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-6 lg:grid-cols-2">
        <BarChart title={t.byDay} bars={summary.byDay} labelEvery={7} />
        <BarChart title={t.byHour} bars={summary.byHour} labelEvery={6} />
      </div>
    </div>
  );
}

// Barras de una sola serie: sin leyenda (el título la nombra), tooltip al pasar o enfocar.
function BarChart({ title, bars, labelEvery }: { title: string; bars: Bar[]; labelEvery: number }) {
  const { m, f } = useI18n();
  const [active, setActive] = useState<number | null>(null);
  const max = niceMax(Math.max(0, ...bars.map((b) => b.value)));
  const total = bars.reduce((sum, b) => sum + b.value, 0);

  return (
    <figure className="flex flex-col gap-2 min-w-0">
      <figcaption className="flex justify-between gap-2 text-sm">
        <span className="font-semibold text-gray-900">{title}</span>
        <span className="text-gray-600 tabular-nums" aria-live="polite">
          {active !== null ? bars[active].tooltip : f(m.stats.total, { count: total })}
        </span>
      </figcaption>
      {total === 0 ? (
        <p className="text-sm text-gray-500 h-40 grid place-items-center border rounded-lg">
          {m.stats.empty}
        </p>
      ) : (
        <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-2">
          <div className="flex flex-col justify-between h-40 text-[11px] text-gray-500 tabular-nums text-right">
            <span>{max}</span>
            <span>{max / 2}</span>
            <span>0</span>
          </div>
          <div className="relative h-40" onMouseLeave={() => setActive(null)}>
            <div className="absolute inset-x-0 top-0 border-t border-gray-100" />
            <div className="absolute inset-x-0 top-1/2 border-t border-gray-100" />
            <div className="absolute inset-x-0 bottom-0 border-t border-gray-300" />
            <div className="absolute inset-0 flex items-end gap-[2px]">
              {bars.map((bar, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={bar.tooltip}
                  onMouseEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                  className="flex-1 h-full flex items-end focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 rounded-sm"
                >
                  <span
                    className="block w-full rounded-t"
                    style={{
                      height: bar.value ? `max(${(bar.value / max) * 100}%, 3px)` : 0,
                      background: BAR_COLOR,
                      opacity: active === null || active === i ? 1 : 0.45,
                    }}
                  />
                </button>
              ))}
            </div>
          </div>
          <div />
          <div className="flex text-[11px] text-gray-500 mt-1">
            {bars.map((bar, i) => (
              <span key={i} className="flex-1 min-w-0 whitespace-nowrap overflow-visible">
                {i % labelEvery === 0 ? bar.label : ""}
              </span>
            ))}
          </div>
        </div>
      )}
    </figure>
  );
}
