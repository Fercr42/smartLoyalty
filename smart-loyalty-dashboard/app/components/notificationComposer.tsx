"use client";
import { useCallback, useEffect, useState } from "react";
import {
  collection,
  getCountFromServer,
  getDocs,
  limit,
  orderBy,
  query,
  Timestamp,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../contexts/AuthContext";

const TYPES = [
  { id: "promo", label: "Promoción", title: "2x1 en tacos hoy", body: "Solo hoy de 5 a 8 pm. Muestra esta notificación en caja." },
  { id: "horario", label: "Horario", title: "Cambio de horario", body: "Este domingo abrimos de 9 am a 4 pm." },
  { id: "evento", label: "Evento", title: "Noche de música en vivo", body: "Este viernes a las 8 pm. ¡Te esperamos!" },
  { id: "aviso", label: "Aviso general", title: "Aviso importante", body: "Escribe aquí tu mensaje." },
];

type Sent = { id: string; type: string; title: string; body: string; sent: number; failed: number; createdAt?: Timestamp };

export default function NotificationComposer() {
  const { user } = useAuth();
  const [type, setType] = useState("promo");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [subscribers, setSubscribers] = useState<number | null>(null);
  const [history, setHistory] = useState<Sent[]>([]);

  const current = TYPES.find((t) => t.id === type)!;

  const load = useCallback(async () => {
    if (!user) return;
    const subs = await getCountFromServer(collection(db, "companies", user.uid, "subscribers"));
    setSubscribers(subs.data().count);
    const snap = await getDocs(
      query(collection(db, "companies", user.uid, "notifications"), orderBy("createdAt", "desc"), limit(10))
    );
    setHistory(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Sent, "id">) })));
  }, [user]);

  useEffect(() => {
    load().catch(console.error);
  }, [load]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!confirm(`¿Enviar a ${subscribers ?? 0} suscriptores?`)) return;
    setSending(true);
    setResult(null);
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await user.getIdToken()}`,
        },
        body: JSON.stringify({ type, title, body, url: url.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al enviar");
      setResult({ ok: true, text: `Enviada a ${data.sent} dispositivos${data.failed ? ` · ${data.failed} fallaron` : ""}.` });
      setTitle("");
      setBody("");
      setUrl("");
      load().catch(console.error);
    } catch (err) {
      setResult({ ok: false, text: err instanceof Error ? err.message : "Error al enviar" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-gray-600">
        Suscriptores: <b className="text-gray-900 tabular-nums">{subscribers ?? "—"}</b>
      </p>

      <form onSubmit={send} className="flex flex-col gap-3">
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
        <input
          id="notif-url"
          type="url"
          placeholder="Enlace al tocar (opcional) · https://..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="border p-2 rounded"
        />

        <div className="rounded-lg bg-gray-100 p-3 text-left">
          <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Vista previa</p>
          <p className="font-semibold text-gray-900">{title || current.title}</p>
          <p className="text-sm text-gray-700">{body || current.body}</p>
        </div>

        <button
          disabled={sending || !subscribers}
          className="bg-blue-600 text-white p-2 rounded disabled:opacity-50"
        >
          {sending ? "Enviando..." : subscribers === 0 ? "Aún no hay suscriptores" : "Enviar notificación"}
        </button>
        {result && <p className={`text-sm ${result.ok ? "text-green-700" : "text-red-600"}`}>{result.text}</p>}
      </form>

      {history.length > 0 && (
        <div>
          <h3 className="font-semibold mb-2">Enviadas</h3>
          <ul className="divide-y">
            {history.map((n) => (
              <li key={n.id} className="py-2 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="font-medium text-gray-900">{n.title}</span>
                  <span className="text-gray-500 tabular-nums whitespace-nowrap">
                    {n.createdAt?.toDate().toLocaleDateString("es")} · {n.sent} env.
                  </span>
                </div>
                <p className="text-gray-600">{n.body}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
