"use client";
import { useCallback, useEffect, useState } from "react";
import { collection, doc, getDoc, getDocs, limit, orderBy, query, setDoc, Timestamp } from "firebase/firestore";
import { QRCodeSVG } from "qrcode.react";
import { db } from "../firebase/config";
import { useAuth } from "../contexts/AuthContext";
import { publicOrigin } from "../lib/origin";
import { cleanRewards, MAX_REWARDS } from "../lib/rewards";
import { syncWalletCards } from "../lib/walletClient";

type Row = { id: string; title: string; stamps: string };
type Event = {
  id: string;
  type: "stamp" | "redeem" | "coupon";
  code: string;
  rewardTitle?: string;
  couponTitle?: string;
  stampsAfter?: number;
  at?: Timestamp;
};
type Notice = { ok: boolean; text: string } | null;

const HINTS = [
  ["Bebida gratis", "5"],
  ["Postre gratis", "8"],
  ["Platillo gratis", "10"],
];
const newRow = (): Row => ({ id: crypto.randomUUID().slice(0, 8), title: "", stamps: "" });

export default function LoyaltyEditor() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([newRow(), newRow()]);
  const [pinSet, setPinSet] = useState(false);
  const [pin, setPin] = useState("");
  const [events, setEvents] = useState<Event[]>([]);
  const [savingRewards, setSavingRewards] = useState(false);
  const [savingPin, setSavingPin] = useState(false);
  const [rewardsNotice, setRewardsNotice] = useState<Notice>(null);
  const [pinNotice, setPinNotice] = useState<Notice>(null);
  const [scanUrl, setScanUrl] = useState("");
  const [reviewEnabled, setReviewEnabled] = useState(false);
  const [reviewUrl, setReviewUrl] = useState("");
  const [reviewDelay, setReviewDelay] = useState("2");
  const [reviewClicks, setReviewClicks] = useState(0);
  const [savingReview, setSavingReview] = useState(false);
  const [reviewNotice, setReviewNotice] = useState<Notice>(null);

  const loadEvents = useCallback(async () => {
    if (!user) return;
    const snap = await getDocs(
      query(collection(db, "companies", user.uid, "loyaltyEvents"), orderBy("at", "desc"), limit(15))
    );
    setEvents(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Event, "id">) })));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setScanUrl(`${publicOrigin(window.location.origin)}/scan/${user.uid}`);
    getDoc(doc(db, "companies", user.uid))
      .then((snap) => {
        const loyalty = snap.data()?.loyalty ?? {};
        const saved = cleanRewards(loyalty.rewards);
        if (saved.length) setRows(saved.map((r) => ({ id: r.id, title: r.title, stamps: String(r.stamps) })));
        setPinSet(Boolean(loyalty.pinSet));
        const reviews = snap.data()?.reviews ?? {};
        setReviewEnabled(Boolean(reviews.enabled));
        setReviewUrl(reviews.url ?? "");
        setReviewDelay(String(reviews.delayHours ?? 2));
        setReviewClicks(reviews.clicks ?? 0);
      })
      .catch(console.error);
    loadEvents().catch(console.error);
  }, [user, loadEvents]);

  const updateRow = (id: string, key: "title" | "stamps", value: string) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, [key]: value } : r)));

  const saveRewards = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const partial = rows.find((r) => (r.title.trim() && !r.stamps) || (!r.title.trim() && r.stamps));
    if (partial) {
      setRewardsNotice({ ok: false, text: "Cada recompensa necesita nombre y número de sellos." });
      return;
    }
    const rewards = cleanRewards(rows.map((r) => ({ id: r.id, title: r.title, stamps: Number(r.stamps) })));
    setSavingRewards(true);
    setRewardsNotice(null);
    try {
      await setDoc(doc(db, "companies", user.uid), { loyalty: { rewards } }, { merge: true });
      const updated = await syncWalletCards(user);
      setRewardsNotice({
        ok: true,
        text: rewards.length
          ? `Guardado${updated ? ` · ${updated} tarjetas de Wallet actualizadas` : ""}.`
          : "Guardado. Sin recompensas, el programa de sellos queda apagado.",
      });
    } catch (err) {
      console.error(err);
      setRewardsNotice({ ok: false, text: "No se pudo guardar. Revisa tu conexión e inténtalo de nuevo." });
    } finally {
      setSavingRewards(false);
    }
  };

  const saveReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (reviewEnabled && !/^https:\/\/\S+$/.test(reviewUrl.trim())) {
      setReviewNotice({ ok: false, text: "Pega el enlace de reseñas de Google (empieza con https://)." });
      return;
    }
    setSavingReview(true);
    setReviewNotice(null);
    try {
      await setDoc(
        doc(db, "companies", user.uid),
        { reviews: { enabled: reviewEnabled, url: reviewUrl.trim(), delayHours: Number(reviewDelay) } },
        { merge: true }
      );
      setReviewNotice({
        ok: true,
        text: reviewEnabled ? "Guardado. Se pedirá reseña después del primer sello de cada cliente." : "Guardado. Pedido de reseña apagado.",
      });
    } catch (err) {
      console.error(err);
      setReviewNotice({ ok: false, text: "No se pudo guardar. Revisa tu conexión e inténtalo de nuevo." });
    } finally {
      setSavingReview(false);
    }
  };

  const savePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingPin(true);
    setPinNotice(null);
    try {
      const res = await fetch("/api/loyalty/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${await user.getIdToken()}` },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo guardar el PIN");
      setPinSet(true);
      setPin("");
      setPinNotice({ ok: true, text: "PIN guardado. Las sesiones abiertas de empleados se cerraron." });
    } catch (err) {
      setPinNotice({ ok: false, text: err instanceof Error ? err.message : "No se pudo guardar el PIN" });
    } finally {
      setSavingPin(false);
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="flex flex-col gap-6">
        <form onSubmit={saveRewards} className="flex flex-col gap-3">
          <div>
            <h3 className="font-semibold text-gray-900">Premios por sellos</h3>
            <p className="text-sm text-gray-600">Cada visita suma 1 sello. Al canjear se descuentan los sellos del premio.</p>
          </div>
          {rows.map((row, i) => (
            <div key={row.id} className="grid grid-cols-[minmax(0,1fr)_5.5rem_auto] gap-2 items-center">
              <input
                id={`reward-title-${row.id}`}
                placeholder={HINTS[i]?.[0] ?? "Nombre del premio"}
                value={row.title}
                maxLength={40}
                onChange={(e) => updateRow(row.id, "title", e.target.value)}
                className="border p-2 rounded min-w-0"
              />
              <input
                id={`reward-stamps-${row.id}`}
                type="number"
                inputMode="numeric"
                min={1}
                max={100}
                placeholder={HINTS[i]?.[1] ?? "10"}
                value={row.stamps}
                onChange={(e) => updateRow(row.id, "stamps", e.target.value)}
                className="border p-2 rounded tabular-nums"
                aria-label="Sellos necesarios"
              />
              <button
                type="button"
                onClick={() => setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.id !== row.id) : [newRow()]))}
                className="text-sm text-red-600 px-1"
                aria-label="Quitar premio"
              >
                Quitar
              </button>
            </div>
          ))}
          {rows.length < MAX_REWARDS && (
            <button
              type="button"
              onClick={() => setRows((rs) => [...rs, newRow()])}
              className="self-start text-sm text-blue-700"
            >
              + Agregar premio
            </button>
          )}
          <button disabled={savingRewards} className="bg-green-600 text-white p-2 rounded disabled:opacity-50">
            {savingRewards ? "Guardando..." : "Guardar premios"}
          </button>
          {rewardsNotice && (
            <p className={`text-sm ${rewardsNotice.ok ? "text-green-700" : "text-red-600"}`}>{rewardsNotice.text}</p>
          )}
        </form>

        <form onSubmit={savePin} className="flex flex-col gap-3 border-t pt-6">
          <div>
            <h3 className="font-semibold text-gray-900">PIN de empleados</h3>
            <p className="text-sm text-gray-600">
              {pinSet ? "PIN activo. Escribe uno nuevo para cambiarlo." : "Tus empleados lo usan para abrir el escáner."}
            </p>
          </div>
          <div className="flex gap-2">
            <input
              id="staff-pin-new"
              type="password"
              inputMode="numeric"
              autoComplete="new-password"
              placeholder="4 a 8 números"
              maxLength={8}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              className="border p-2 rounded flex-1 min-w-0"
            />
            <button
              disabled={savingPin || pin.length < 4}
              className="bg-gray-900 text-white px-4 rounded disabled:opacity-50"
            >
              {savingPin ? "Guardando..." : pinSet ? "Cambiar PIN" : "Guardar PIN"}
            </button>
          </div>
          {pinNotice && (
            <p className={`text-sm ${pinNotice.ok ? "text-green-700" : "text-red-600"}`}>{pinNotice.text}</p>
          )}
        </form>

        <form onSubmit={saveReview} className="flex flex-col gap-3 border-t pt-6">
          <div>
            <h3 className="font-semibold text-gray-900">Pedir reseña en Google</h3>
            <p className="text-sm text-gray-600">
              Después del primer sello, el cliente recibe una notificación para dejar una reseña. Se pide una sola vez
              por cliente.
            </p>
          </div>
          <label htmlFor="review-enabled" className="flex items-center gap-2 text-sm text-gray-800">
            <input
              id="review-enabled"
              type="checkbox"
              checked={reviewEnabled}
              onChange={(e) => setReviewEnabled(e.target.checked)}
            />
            Pedir reseña automáticamente
          </label>
          <input
            id="review-url"
            type="url"
            placeholder="Enlace de reseñas · https://g.page/r/.../review"
            value={reviewUrl}
            onChange={(e) => setReviewUrl(e.target.value)}
            className="border p-2 rounded"
          />
          <p className="text-xs text-gray-500">
            En tu Perfil de Negocio de Google: <b>Pedir reseñas</b> → copia el enlace.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="review-delay" className="text-sm text-gray-700">
              Enviar
            </label>
            <select
              id="review-delay"
              value={reviewDelay}
              onChange={(e) => setReviewDelay(e.target.value)}
              className="border p-2 rounded text-sm"
            >
              <option value="1">1 hora después de la visita</option>
              <option value="2">2 horas después de la visita</option>
              <option value="4">4 horas después de la visita</option>
              <option value="24">Al día siguiente</option>
            </select>
            <button disabled={savingReview} className="bg-gray-900 text-white px-4 py-2 rounded disabled:opacity-50">
              {savingReview ? "Guardando..." : "Guardar"}
            </button>
          </div>
          <p className="text-xs text-gray-500 tabular-nums">{reviewClicks} clientes abrieron el enlace de reseña.</p>
          {reviewNotice && (
            <p className={`text-sm ${reviewNotice.ok ? "text-green-700" : "text-red-600"}`}>{reviewNotice.text}</p>
          )}
        </form>
      </div>

      <div className="flex flex-col gap-6">
        {scanUrl && (
          <div className="flex gap-4 items-center border rounded-lg p-4">
            <div className="bg-white p-1.5 border rounded">
              <QRCodeSVG value={scanUrl} size={96} />
            </div>
            <div className="min-w-0 flex flex-col gap-1">
              <p className="font-semibold text-gray-900">Escáner para empleados</p>
              <p className="text-sm text-gray-600">Escanéalo con el celular del empleado y guárdalo en su pantalla de inicio.</p>
              <a href={scanUrl} target="_blank" className="text-sm text-blue-700 break-all">
                Abrir escáner
              </a>
            </div>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-900">Actividad reciente</h3>
            <button type="button" onClick={() => loadEvents().catch(console.error)} className="text-sm text-blue-700">
              Actualizar
            </button>
          </div>
          {events.length === 0 ? (
            <p className="text-sm text-gray-500">Aún no hay sellos ni canjes.</p>
          ) : (
            <ul className="divide-y text-sm">
              {events.map((ev) => (
                <li key={ev.id} className="py-2 flex justify-between gap-3">
                  <span className="min-w-0">
                    <b className="text-gray-900">
                      {ev.type === "stamp"
                        ? "+1 sello"
                        : ev.type === "redeem"
                          ? `Canjeó ${ev.rewardTitle}`
                          : `Usó cupón ${ev.couponTitle}`}
                    </b>{" "}
                    <span className="font-mono text-gray-500">#{ev.code}</span>
                    {ev.type !== "coupon" && (
                      <span className="block text-xs text-gray-500">Quedó con {ev.stampsAfter} sellos</span>
                    )}
                  </span>
                  <span className="text-gray-500 text-xs whitespace-nowrap tabular-nums">
                    {ev.at?.toDate().toLocaleString("es", { dateStyle: "short", timeStyle: "short" })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
