"use client";
import { useCallback, useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import { useAuth } from "../contexts/AuthContext";
import Auth from "../components/auth";
import BrandLogo from "../components/brandLogo";
import CampaignResults from "../components/campaignResults";
import StatsPanel from "../components/statsPanel";
import CustomersList from "../components/customersList";
import { auth } from "../firebase/config";

// Administrador de Smart Loyalty: todos los restaurantes, planes, pruebas por vencer e ingresos.

type Restaurant = {
  id: string;
  name: string;
  ownerName: string;
  ownerEmail: string;
  phone: string;
  city: string;
  createdAt: number | null;
  plan: {
    status: "none" | "trial" | "active" | "expired";
    daysLeft: number;
    allowed: boolean;
    paidUntil?: number;
    provider: string | null;
    canceled?: boolean;
    trialEndsAt: number | null;
  };
  usage: { members: number; devices: number; activity30: number; sends30: number };
};
type Feedback = { id: string; rating: number; comment: string; code: string | null; at: number | null };
type Overview = {
  summary: { total: number; trial: number; trialEndingSoon: number; paying: number; manual: number; expired: number; none: number; monthlyRevenueUsd: number };
  restaurants: Restaurant[];
  generatedAt: number;
};

const FILTERS = [
  { id: "all", label: "Todos" },
  { id: "trial", label: "En prueba" },
  { id: "soon", label: "Vencen pronto" },
  { id: "active", label: "Activos" },
  { id: "expired", label: "Vencidos" },
] as const;
type FilterId = (typeof FILTERS)[number]["id"];

const ACTIONS = [
  { id: "activate_30", label: "Activar 30 días (pago manual)" },
  { id: "activate_forever", label: "Activar sin vencimiento" },
  { id: "extend_trial", label: "Extender prueba 7 días" },
  { id: "expire", label: "Desactivar plan" },
];

const DAY = 86_400_000;
const formatDate = (ms: number | null | undefined) =>
  ms ? new Date(ms).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" }) : "—";

function planLabel(r: Restaurant, now: number) {
  const p = r.plan;
  if (p.status === "trial") return { text: `Prueba · ${p.daysLeft} ${p.daysLeft === 1 ? "día" : "días"}`, tone: (p.trialEndsAt ?? 0) - now <= 3 * DAY ? "warn" : "info" };
  if (p.status === "active" && p.provider === "paypal") return { text: p.canceled ? "PayPal · cancelado" : "PayPal · pagando", tone: p.canceled ? "warn" : "ok" };
  if (p.status === "active") return { text: p.paidUntil ? "Manual · con fecha" : "Activo manual", tone: "ok" };
  if (p.status === "none") return { text: "Sin registro completo", tone: "muted" };
  return { text: "Vencido", tone: "bad" };
}

const TONES: Record<string, string> = {
  ok: "bg-emerald-50 text-emerald-800 border-emerald-200",
  info: "bg-sky-50 text-sky-800 border-sky-200",
  warn: "bg-amber-50 text-amber-900 border-amber-200",
  bad: "bg-red-50 text-red-800 border-red-200",
  muted: "bg-gray-50 text-gray-600 border-gray-200",
};

export default function AdminPage() {
  const { user, loading } = useAuth();
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<FilterId>("all");
  const [actions, setActions] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState("");
  const [openId, setOpenId] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch("/api/admin/overview", { headers: { Authorization: `Bearer ${await user.getIdToken()}` } });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "No se pudo cargar");
      setData(body);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar");
    }
  }, [user]);

  useEffect(() => {
    load().catch(console.error);
  }, [load]);

  const apply = async (r: Restaurant) => {
    const action = actions[r.id] ?? ACTIONS[0].id;
    const label = ACTIONS.find((a) => a.id === action)?.label ?? action;
    const paypalWarning = r.plan.provider === "paypal" && action !== "extend_trial" ? "\n\nOjo: tiene suscripción de PayPal; esto no la cancela en PayPal." : "";
    if (!user || !confirm(`${label} para "${r.name}"?${paypalWarning}`)) return;
    setBusy(r.id);
    try {
      const res = await fetch("/api/admin/company", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${await user.getIdToken()}` },
        body: JSON.stringify({ companyId: r.id, action }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "No se pudo aplicar");
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "No se pudo aplicar");
    } finally {
      setBusy("");
    }
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center">Cargando...</div>;
  if (!user) return <Auth />;

  if (error && !data) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="bg-white border rounded-2xl p-8 max-w-md text-center flex flex-col gap-3">
          <h1 className="text-xl font-bold">Administrador</h1>
          <p className="text-gray-600">{error}</p>
          <button onClick={() => signOut(auth)} className="text-sm text-gray-500">
            Cerrar sesión ({user.email})
          </button>
        </div>
      </div>
    );
  }
  if (!data) return <div className="flex min-h-screen items-center justify-center">Cargando restaurantes...</div>;

  const now = data.generatedAt;
  const visible = data.restaurants.filter((r) => {
    if (filter === "trial") return r.plan.status === "trial";
    if (filter === "soon") return r.plan.status === "trial" && (r.plan.trialEndsAt ?? 0) - now <= 3 * DAY;
    if (filter === "active") return r.plan.status === "active";
    if (filter === "expired") return r.plan.status === "expired";
    return true;
  });
  const openRestaurant = data.restaurants.find((r) => r.id === openId) ?? null;
  const s = data.summary;
  const tiles = [
    { label: "Restaurantes", value: s.total, note: s.none ? `${s.none} sin terminar registro` : "registrados" },
    { label: "En prueba", value: s.trial, note: `${s.trialEndingSoon} vencen en 3 días` },
    { label: "Pagando con PayPal", value: s.paying, note: "suscripciones activas" },
    { label: "Activos manuales", value: s.manual, note: "activados por ti" },
    { label: "Vencidos", value: s.expired, note: "sin plan activo" },
    { label: "Ingreso mensual", value: `${s.monthlyRevenueUsd} USD`, note: "estimado por PayPal" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <BrandLogo size={26} />
            <span className="font-medium text-gray-500 hidden sm:inline">· Administrador</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => load().catch(console.error)} className="text-sm border rounded-md px-3 py-1.5 hover:bg-gray-100">
              Actualizar
            </button>
            <button onClick={() => signOut(auth)} className="text-sm text-gray-600">
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
        <dl className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {tiles.map((t) => (
            <div key={t.label} className="bg-white border rounded-xl p-4">
              <dt className="text-xs text-gray-500">{t.label}</dt>
              <dd className="text-2xl font-semibold text-gray-900 tabular-nums">{t.value}</dd>
              <dd className="text-xs text-gray-500">{t.note}</dd>
            </div>
          ))}
        </dl>

        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-full text-sm border ${filter === f.id ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-700 hover:bg-gray-100"}`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="bg-white border rounded-xl overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b bg-gray-50">
                <th className="px-4 py-2 font-medium">Restaurante</th>
                <th className="px-4 py-2 font-medium">Dueño</th>
                <th className="px-4 py-2 font-medium">Plan</th>
                <th className="px-4 py-2 font-medium text-right">Uso (30 días)</th>
                <th className="px-4 py-2 font-medium">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {visible.map((r) => {
                const label = planLabel(r, now);
                const whatsapp = r.phone.replace(/\D/g, "");
                return (
                  <tr key={r.id} className="align-top">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{r.name}</p>
                      <p className="text-xs text-gray-500">
                        {r.city || "—"} · desde {formatDate(r.createdAt)}
                      </p>
                      <div className="flex flex-col items-start gap-0.5">
                        <a href={`/join/${r.id}`} target="_blank" className="text-xs text-blue-700">
                          Ver página del QR
                        </a>
                        <button
                          onClick={() => setOpenId((id) => (id === r.id ? "" : r.id))}
                          className="text-xs font-medium text-gray-900 underline"
                        >
                          {openId === r.id ? "Ocultar datos" : "Ver datos"}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-900">{r.ownerName || "—"}</p>
                      <p className="text-xs text-gray-500 break-all">{r.ownerEmail}</p>
                      {whatsapp && (
                        <a href={`https://wa.me/${whatsapp}`} target="_blank" className="text-xs text-green-700">
                          WhatsApp {r.phone}
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block text-xs font-medium border rounded-full px-2 py-0.5 ${TONES[label.tone]}`}>{label.text}</span>
                      <p className="text-xs text-gray-500 mt-1">
                        {r.plan.status === "trial" && `Termina ${formatDate(r.plan.trialEndsAt)}`}
                        {r.plan.status === "active" && r.plan.paidUntil && `Hasta ${formatDate(r.plan.paidUntil)}`}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-gray-600 tabular-nums">
                      <p>
                        <b className="text-gray-900">{r.usage.members}</b> clientes · <b className="text-gray-900">{r.usage.devices}</b> celulares
                      </p>
                      <p>
                        <b className="text-gray-900">{r.usage.activity30}</b> movimientos · <b className="text-gray-900">{r.usage.sends30}</b> envíos
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <select
                          id={`admin-action-${r.id}`}
                          value={actions[r.id] ?? ACTIONS[0].id}
                          onChange={(e) => setActions((a) => ({ ...a, [r.id]: e.target.value }))}
                          className="border rounded p-1.5 text-xs max-w-[13rem]"
                        >
                          {ACTIONS.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.label}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => apply(r)}
                          disabled={busy === r.id}
                          className="text-xs bg-gray-900 text-white rounded px-3 disabled:opacity-50"
                        >
                          {busy === r.id ? "..." : "Aplicar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!visible.length && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                    No hay restaurantes en este filtro.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <SupportInbox />

        {openRestaurant && (
          <section className="flex flex-col gap-6">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="text-xl font-bold text-gray-900">Datos de {openRestaurant.name}</h2>
              <button onClick={() => setOpenId("")} className="text-sm text-gray-600 border rounded-md px-3 py-1.5 hover:bg-gray-100">
                Cerrar
              </button>
            </div>
            <p className="text-sm text-gray-500 -mt-4">
              Solo lectura. El dueño ve lo mismo en su panel; desde aquí no se envían mensajes ni se cambia su configuración.
            </p>
            <div className="bg-white border rounded-xl p-5">
              <StatsPanel companyId={openRestaurant.id} />
            </div>
            <div className="bg-white border rounded-xl p-5">
              <h3 className="font-semibold text-gray-900 mb-3">Clientes</h3>
              <CustomersList companyId={openRestaurant.id} />
            </div>
            <div className="bg-white border rounded-xl p-5">
              <CampaignResults companyId={openRestaurant.id} />
            </div>
            <AdminFeedback companyId={openRestaurant.id} />
          </section>
        )}
      </main>
    </div>
  );
}

type Ticket = { id: string; name: string; email: string; business: string; message: string; locale: string; at: number | null };

// Mensajes que llegan de la página de soporte.
function SupportInbox() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    user
      .getIdToken()
      .then((token) => fetch("/api/admin/support", { headers: { Authorization: `Bearer ${token}` } }))
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "No se pudieron cargar los mensajes");
        if (alive) setTickets(body.tickets);
      })
      .catch((e) => alive && setError(e instanceof Error ? e.message : "No se pudieron cargar los mensajes"));
    return () => {
      alive = false;
    };
  }, [user]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!tickets) return null;

  return (
    <section className="bg-white border rounded-xl p-5 flex flex-col gap-3">
      <button type="button" onClick={() => setOpen(!open)} className="flex items-baseline justify-between gap-3 text-left">
        <h2 className="font-semibold text-gray-900">Mensajes de soporte</h2>
        <span className="text-sm text-gray-600">{tickets.length ? `${tickets.length} mensajes` : "Sin mensajes"}</span>
      </button>
      {open && tickets.length > 0 && (
        <ul className="divide-y text-sm">
          {tickets.map((t) => (
            <li key={t.id} className="py-3 flex flex-col gap-1">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-semibold text-gray-900">
                  {t.name || "Sin nombre"}
                  {t.business && <span className="font-normal text-gray-600"> · {t.business}</span>}{" "}
                  <a href={`mailto:${t.email}`} className="font-normal text-blue-700 underline">
                    {t.email}
                  </a>
                </p>
                <span className="text-xs text-gray-500 tabular-nums">
                  {t.at ? new Date(t.at).toLocaleString("es-CR", { dateStyle: "short", timeStyle: "short" }) : ""}
                  {t.locale && ` · ${t.locale}`}
                </span>
              </div>
              <p className="text-gray-700 whitespace-pre-wrap">{t.message}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// Opiniones de la encuesta de un restaurante (solo administrador).
function AdminFeedback({ companyId }: { companyId: string }) {
  const { user } = useAuth();
  const [data, setData] = useState<{ average: number | null; count: number; feedback: Feedback[] } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    let alive = true;
    user
      .getIdToken()
      .then((token) => fetch(`/api/admin/feedback?companyId=${companyId}`, { headers: { Authorization: `Bearer ${token}` } }))
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "No se pudieron cargar las opiniones");
        if (alive) setData(body);
      })
      .catch((e) => alive && setError(e instanceof Error ? e.message : "No se pudieron cargar las opiniones"));
    return () => {
      alive = false;
    };
  }, [user, companyId]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!data) return <p className="text-sm text-gray-500">Cargando opiniones...</p>;

  return (
    <div className="bg-white border rounded-xl p-5 flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-semibold text-gray-900">Opiniones de la encuesta</h3>
        <span className="text-sm text-gray-600 tabular-nums">
          {data.count ? `${(data.average ?? 0).toFixed(1)} ★ · ${data.count} opiniones` : "Aún sin opiniones"}
        </span>
      </div>
      {data.feedback.length > 0 && (
        <ul className="divide-y text-sm">
          {data.feedback.map((f) => (
            <li key={f.id} className="py-2">
              <div className="flex justify-between gap-3">
                <span className={f.rating <= 3 ? "text-red-700 font-medium" : "text-gray-900 font-medium"}>
                  {"★".repeat(f.rating)}
                  <span className="text-gray-300">{"★".repeat(5 - f.rating)}</span>
                </span>
                <span className="text-xs text-gray-500 whitespace-nowrap tabular-nums">
                  {f.code ? `#${f.code} · ` : ""}
                  {formatDate(f.at)}
                </span>
              </div>
              {f.comment && <p className="text-gray-700">{f.comment}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
