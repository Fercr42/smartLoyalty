"use client";
import { useCallback, useEffect, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../contexts/AuthContext";
import { formatDay } from "../lib/format";
import { compressImage } from "../lib/image";
import { AUTOMATIC_LABELS } from "../lib/notification-labels";

// Igual que MAX_IMAGE en lib/send-notification (~2 MB de foto).
const MAX_IMAGE_CHARS = 2_800_000;

const TYPES = [
  { id: "promo", label: "Promoción", title: "2x1 en tacos hoy", body: "Solo hoy de 5 a 8 pm. Muestra esta notificación en caja." },
  { id: "horario", label: "Horario", title: "Cambio de horario", body: "Este domingo abrimos de 9 am a 4 pm." },
  { id: "evento", label: "Evento", title: "Noche de música en vivo", body: "Este viernes a las 8 pm. ¡Te esperamos!" },
  { id: "aviso", label: "Aviso general", title: "Aviso importante", body: "Escribe aquí tu mensaje." },
];

const AUDIENCES = [
  { id: "all", label: "Todos", hint: "todos los suscritos" },
  { id: "frequent", label: "Frecuentes", hint: "5 visitas o más" },
  { id: "inactive", label: "Inactivos", hint: "sin venir en 30 días" },
  { id: "near_reward", label: "Cerca de un premio", hint: "les falta 1 sello" },
] as const;
type AudienceId = (typeof AUDIENCES)[number]["id"];
type Counts = Record<AudienceId, { devices: number; members: number }>;

const REPEATS = { none: "Una sola vez", daily: "Cada día", weekly: "Cada semana" } as const;

type RepeatId = keyof typeof REPEATS;

type Sent = {
  id: string;
  title: string;
  body: string;
  sent: number;
  views?: number;
  hasImage?: boolean;
  couponId?: string;
  audience?: string;
  kind?: string;
  createdAt?: Timestamp;
};
type Scheduled = {
  id: string;
  sendAt: Timestamp;
  repeat: RepeatId;
  payload: { title: string; body: string; audience: AudienceId; couponId?: string; kind?: string; memberIds?: string[] };
};
type Coupon = { id: string; title: string; expiresDate: string; active: boolean; redemptions: number; expiresAt: Timestamp };
type Result = { ok: boolean; text: string; url?: string } | null;

const pad = (n: number) => String(n).padStart(2, "0");
const toLocalInput = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const formatDateTime = (ms: number) => new Date(ms).toLocaleString("es", { dateStyle: "medium", timeStyle: "short" });
const audienceLabel = (id?: string) => AUDIENCES.find((a) => a.id === id)?.label ?? "Clientes elegidos";

export default function NotificationComposer() {
  const { user } = useAuth();
  const [type, setType] = useState("promo");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [imageData, setImageData] = useState<string | null>(null);
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [audience, setAudience] = useState<AudienceId>("all");
  const [withCoupon, setWithCoupon] = useState(false);
  const [couponTitle, setCouponTitle] = useState("");
  const [couponExpires, setCouponExpires] = useState(() => toLocalInput(new Date(Date.now() + 7 * 86_400_000)).slice(0, 10));
  const [when, setWhen] = useState<"now" | "later">("now");
  const [sendAt, setSendAt] = useState(() => toLocalInput(new Date(Date.now() + 3_600_000)));
  const [repeat, setRepeat] = useState<RepeatId>("none");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<Result>(null);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [history, setHistory] = useState<Sent[]>([]);
  const [scheduled, setScheduled] = useState<Scheduled[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);

  const current = TYPES.find((t) => t.id === type)!;

  const load = useCallback(async () => {
    if (!user) return;
    const [countsData, sentSnap, jobsSnap, couponsSnap] = await Promise.all([
      fetch("/api/notifications/audience", { headers: { Authorization: `Bearer ${await user.getIdToken()}` } })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      getDocs(query(collection(db, "companies", user.uid, "notifications"), orderBy("createdAt", "desc"), limit(10))),
      getDocs(query(collection(db, "scheduledJobs"), where("companyId", "==", user.uid))),
      getDocs(query(collection(db, "companies", user.uid, "coupons"), orderBy("createdAt", "desc"), limit(10))),
    ]);
    setCounts(countsData);
    setHistory(sentSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Sent, "id">) })));
    setScheduled(
      jobsSnap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<Scheduled, "id">) }))
        .sort((a, b) => a.sendAt.toMillis() - b.sendAt.toMillis())
    );
    setCoupons(couponsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Coupon, "id">) })));
  }, [user]);

  useEffect(() => {
    load().catch(console.error);
  }, [load]);

  const handleImage = async (file: File | undefined) => {
    setResult(null);
    if (!file) return;
    try {
      setImageData(await compressImage(file, 1600, MAX_IMAGE_CHARS));
    } catch (err) {
      setResult({ ok: false, text: err instanceof Error ? err.message : "Imagen inválida" });
    }
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const later = when === "later";
    const sendAtMs = later ? new Date(sendAt).getTime() : undefined;
    if (later && (!sendAtMs || sendAtMs < Date.now())) {
      setResult({ ok: false, text: "Elige una fecha y hora que todavía no haya pasado." });
      return;
    }
    if (withCoupon && !couponTitle.trim()) {
      setResult({ ok: false, text: "Escribe el nombre del cupón." });
      return;
    }

    const target = counts?.[audience];
    const who = audience === "all" ? "todos" : audienceLabel(audience).toLowerCase();
    const question = later
      ? `¿Programar para ${formatDateTime(sendAtMs!)}${repeat !== "none" ? ` (${REPEATS[repeat].toLowerCase()})` : ""}, a ${who}?`
      : `¿Enviar ahora a ${who}${target ? ` (${target.devices} celulares)` : ""}?`;
    if (!confirm(question)) return;

    setSending(true);
    setResult(null);
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${await user.getIdToken()}` },
        body: JSON.stringify({
          type,
          title,
          body,
          audience,
          imageData: imageData ?? undefined,
          ctaLabel: ctaLabel.trim() || undefined,
          ctaUrl: ctaUrl.trim() || undefined,
          coupon: withCoupon
            ? {
                title: couponTitle.trim(),
                expiresDate: couponExpires,
                expiresAt: new Date(`${couponExpires}T23:59:59`).getTime(),
              }
            : undefined,
          sendAt: sendAtMs,
          repeat: later ? repeat : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al enviar");
      setResult(
        data.scheduled
          ? { ok: true, text: `Programada para ${formatDateTime(data.sendAt)}.` }
          : {
              ok: true,
              text: `Enviada a ${data.sent} celulares${data.failed ? ` · ${data.failed} fallaron` : ""}${
                data.wallet === "ok" ? " · Google Wallet: enviada" : data.wallet === "error" ? " · Google Wallet: falló" : ""
              }.`,
              url: data.promoUrl,
            }
      );
      setTitle("");
      setBody("");
      setImageData(null);
      setCtaLabel("");
      setCtaUrl("");
      setWithCoupon(false);
      setCouponTitle("");
      load().catch(console.error);
    } catch (err) {
      setResult({ ok: false, text: err instanceof Error ? err.message : "Error al enviar" });
    } finally {
      setSending(false);
    }
  };

  const cancelScheduled = async (job: Scheduled) => {
    if (!confirm(`¿Cancelar "${job.payload.title}"?`)) return;
    await deleteDoc(doc(db, "scheduledJobs", job.id));
    load().catch(console.error);
  };

  const deactivateCoupon = async (coupon: Coupon) => {
    if (!user || !confirm(`¿Desactivar el cupón "${coupon.title}"? Ya no se podrá usar.`)) return;
    await updateDoc(doc(db, "companies", user.uid, "coupons", coupon.id), { active: false });
    load().catch(console.error);
  };

  const nobody = when === "now" && counts && counts[audience].devices === 0 && counts[audience].members === 0;

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <form onSubmit={send} className="flex flex-col gap-4">
        <p className="text-sm text-gray-600">
          Celulares suscritos: <b className="text-gray-900 tabular-nums">{counts?.all.devices ?? "—"}</b>
          {" · "}Clientes con tarjeta: <b className="text-gray-900 tabular-nums">{counts?.all.members ?? "—"}</b>
        </p>

        <div className="flex flex-wrap gap-2">
          {TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setType(t.id)}
              className={`px-3 py-1.5 rounded-full text-sm border ${
                type === t.id ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-700 hover:bg-gray-100"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <input
          id="notif-title"
          placeholder={`Título · ej. ${current.title}`}
          value={title}
          maxLength={65}
          onChange={(e) => setTitle(e.target.value)}
          className="border p-2 rounded"
          required
        />
        <textarea
          id="notif-body"
          placeholder={`Mensaje · ej. ${current.body}`}
          value={body}
          maxLength={240}
          rows={3}
          onChange={(e) => setBody(e.target.value)}
          className="border p-2 rounded"
          required
        />

        <div className="flex flex-wrap items-center gap-3">
          <label className="border px-3 py-1.5 rounded text-sm cursor-pointer hover:bg-gray-100">
            {imageData ? "Cambiar foto" : "Agregar foto (opcional)"}
            <input
              id="notif-image"
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                handleImage(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
          {imageData && (
            <button type="button" onClick={() => setImageData(null)} className="text-sm text-red-600">
              Quitar foto
            </button>
          )}
        </div>

        <fieldset className="border rounded p-3 flex flex-col gap-2">
          <legend className="text-sm text-gray-600 px-1">¿A quién?</legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {AUDIENCES.map((a) => (
              <label
                key={a.id}
                htmlFor={`audience-${a.id}`}
                className={`border rounded-lg p-2 cursor-pointer text-sm ${
                  audience === a.id ? "border-gray-900 bg-gray-50" : "hover:bg-gray-50"
                }`}
              >
                <span className="flex items-center gap-2">
                  <input
                    id={`audience-${a.id}`}
                    type="radio"
                    name="audience"
                    checked={audience === a.id}
                    onChange={() => setAudience(a.id)}
                  />
                  <b className="text-gray-900">{a.label}</b>
                </span>
                <span className="block text-xs text-gray-500 pl-5">
                  {a.hint} · {counts ? `${counts[a.id].devices} celulares` : "…"}
                </span>
              </label>
            ))}
          </div>
          {audience !== "all" && (
            <p className="text-xs text-gray-500">
              Los grupos solo incluyen a quien tiene tarjeta de cliente. Los celulares que se suscribieron antes se suman
              cuando vuelven a abrir la página del QR.
            </p>
          )}
        </fieldset>

        <fieldset className="border rounded p-3 flex flex-col gap-2">
          <legend className="text-sm text-gray-600 px-1">Cupón (opcional)</legend>
          <label htmlFor="notif-with-coupon" className="flex items-center gap-2 text-sm text-gray-800">
            <input
              id="notif-with-coupon"
              type="checkbox"
              checked={withCoupon}
              onChange={(e) => setWithCoupon(e.target.checked)}
            />
            Incluir un cupón de un solo uso
          </label>
          {withCoupon && (
            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
              <input
                id="notif-coupon-title"
                placeholder="Ej. 20% de descuento"
                value={couponTitle}
                maxLength={60}
                onChange={(e) => setCouponTitle(e.target.value)}
                className="border p-2 rounded min-w-0"
              />
              <label htmlFor="notif-coupon-expires" className="flex items-center gap-2 text-sm text-gray-600">
                Vence
                <input
                  id="notif-coupon-expires"
                  type="date"
                  value={couponExpires}
                  onChange={(e) => setCouponExpires(e.target.value)}
                  className="border p-2 rounded"
                />
              </label>
              <p className="col-span-2 text-xs text-gray-500">
                El cliente muestra su tarjeta en caja y el empleado lo marca como usado en el escáner.
              </p>
            </div>
          )}
        </fieldset>

        <fieldset className="border rounded p-3 flex flex-col gap-2">
          <legend className="text-sm text-gray-600 px-1">Botón en la página de la promo (opcional)</legend>
          <input
            id="notif-cta-label"
            placeholder="Texto · ej. Reservar mesa"
            value={ctaLabel}
            maxLength={30}
            onChange={(e) => setCtaLabel(e.target.value)}
            className="border p-2 rounded"
          />
          <input
            id="notif-cta-url"
            type="url"
            placeholder="Enlace · https://..."
            value={ctaUrl}
            onChange={(e) => setCtaUrl(e.target.value)}
            className="border p-2 rounded"
          />
        </fieldset>

        <fieldset className="border rounded p-3 flex flex-col gap-2">
          <legend className="text-sm text-gray-600 px-1">¿Cuándo?</legend>
          <div className="flex flex-wrap gap-4 text-sm">
            <label htmlFor="when-now" className="flex items-center gap-2">
              <input id="when-now" type="radio" name="when" checked={when === "now"} onChange={() => setWhen("now")} />
              Enviar ahora
            </label>
            <label htmlFor="when-later" className="flex items-center gap-2">
              <input id="when-later" type="radio" name="when" checked={when === "later"} onChange={() => setWhen("later")} />
              Programar
            </label>
          </div>
          {when === "later" && (
            <div className="flex flex-wrap gap-2">
              <input
                id="notif-send-at"
                type="datetime-local"
                value={sendAt}
                onChange={(e) => setSendAt(e.target.value)}
                className="border p-2 rounded"
              />
              <select
                id="notif-repeat"
                value={repeat}
                onChange={(e) => setRepeat(e.target.value as RepeatId)}
                className="border p-2 rounded"
              >
                {Object.entries(REPEATS).map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
              <p className="w-full text-xs text-gray-500">Puede llegar hasta unos 10 minutos después de la hora elegida.</p>
            </div>
          )}
        </fieldset>

        <button disabled={sending || Boolean(nobody)} className="bg-blue-600 text-white p-2 rounded disabled:opacity-50">
          {sending
            ? when === "later"
              ? "Programando..."
              : "Enviando..."
            : nobody
              ? "No hay nadie en este grupo"
              : when === "later"
                ? "Programar envío"
                : "Enviar notificación"}
        </button>
        {result && (
          <p className={`text-sm ${result.ok ? "text-green-700" : "text-red-600"}`}>
            {result.text}{" "}
            {result.url && (
              <a href={result.url} target="_blank" className="underline">
                Ver página de la promo
              </a>
            )}
          </p>
        )}
      </form>

      <div className="flex flex-col gap-6">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Vista previa (Android)</p>
          <div className="rounded-xl bg-gray-100 p-3 text-left shadow-inner">
            <p className="font-semibold text-gray-900">{title || current.title}</p>
            <p className="text-sm text-gray-700">{body || current.body}</p>
            {imageData && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageData} alt="" className="mt-2 rounded-lg w-full max-h-48 object-cover" />
            )}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            En iPhone la foto no aparece en la notificación, pero sí en la página que se abre al tocarla.
          </p>
        </div>

        {scheduled.length > 0 && (
          <div>
            <h3 className="font-semibold mb-2">Programadas</h3>
            <ul className="divide-y text-sm">
              {scheduled.map((job) => (
                <li key={job.id} className="py-2 flex justify-between gap-3">
                  <span className="min-w-0">
                    <span className="font-medium text-gray-900">{job.payload.title}</span>
                    <span className="block text-xs text-gray-500">
                      {formatDateTime(job.sendAt.toMillis())} · {REPEATS[job.repeat] ?? REPEATS.none} ·{" "}
                      {job.payload.memberIds
                        ? `${AUTOMATIC_LABELS[job.payload.kind ?? ""] ?? "Envío automático"} · ${
                            job.payload.memberIds.length === 1 ? "1 cliente" : `${job.payload.memberIds.length} clientes`
                          }`
                        : audienceLabel(job.payload.audience)}
                      {job.payload.couponId ? " · con cupón" : ""}
                    </span>
                  </span>
                  <button onClick={() => cancelScheduled(job)} className="text-xs text-red-600 whitespace-nowrap">
                    Cancelar
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {coupons.length > 0 && (
          <div>
            <h3 className="font-semibold mb-2">Cupones</h3>
            <ul className="divide-y text-sm">
              {coupons.map((c) => {
                const live = c.active && c.expiresAt.toMillis() > Date.now();
                return (
                  <li key={c.id} className="py-2 flex justify-between gap-3">
                    <span className="min-w-0">
                      <span className="font-medium text-gray-900">{c.title}</span>
                      <span className="block text-xs text-gray-500">
                        {c.redemptions} usados · {live ? `vence el ${formatDay(c.expiresDate)}` : "inactivo"}
                      </span>
                    </span>
                    {live && (
                      <button onClick={() => deactivateCoupon(c)} className="text-xs text-red-600 whitespace-nowrap">
                        Desactivar
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {history.length > 0 && user && (
          <div>
            <h3 className="font-semibold mb-2">Enviadas</h3>
            <ul className="divide-y">
              {history.map((n) => (
                <li key={n.id} className="py-2 text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="font-medium text-gray-900">{n.title}</span>
                    <span className="text-gray-500 tabular-nums whitespace-nowrap">
                      {n.createdAt?.toDate().toLocaleDateString("es")}
                    </span>
                  </div>
                  <p className="text-gray-600">{n.body}</p>
                  <p className="text-xs text-gray-500 tabular-nums">
                    {n.sent} enviados · {n.views ?? 0} abiertas ·{" "}
                    {AUTOMATIC_LABELS[n.kind ?? ""] ?? audienceLabel(n.audience ?? "all")}
                    {n.couponId ? " · con cupón" : ""}
                    {" · "}
                    <a href={`/promo/${user.uid}/${n.id}`} target="_blank" className="text-blue-600">
                      Ver página
                    </a>
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
