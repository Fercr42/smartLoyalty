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
import { compressImage } from "../lib/image";

// Igual que MAX_IMAGE en /api/notifications (~2 MB de foto).
const MAX_IMAGE_CHARS = 2_800_000;

const TYPES = [
  { id: "promo", label: "Promoción", title: "2x1 en tacos hoy", body: "Solo hoy de 5 a 8 pm. Muestra esta notificación en caja." },
  { id: "horario", label: "Horario", title: "Cambio de horario", body: "Este domingo abrimos de 9 am a 4 pm." },
  { id: "evento", label: "Evento", title: "Noche de música en vivo", body: "Este viernes a las 8 pm. ¡Te esperamos!" },
  { id: "aviso", label: "Aviso general", title: "Aviso importante", body: "Escribe aquí tu mensaje." },
];

type Sent = {
  id: string;
  type: string;
  title: string;
  body: string;
  sent: number;
  failed: number;
  hasImage?: boolean;
  createdAt?: Timestamp;
};

export default function NotificationComposer() {
  const { user } = useAuth();
  const [type, setType] = useState("promo");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [imageData, setImageData] = useState<string | null>(null);
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string; url?: string } | null>(null);
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
        body: JSON.stringify({
          type,
          title,
          body,
          imageData: imageData ?? undefined,
          ctaLabel: ctaLabel.trim() || undefined,
          ctaUrl: ctaUrl.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al enviar");
      setResult({
        ok: true,
        text: `Enviada a ${data.sent} dispositivos${data.failed ? ` · ${data.failed} fallaron` : ""}.`,
        url: data.promoUrl,
      });
      setTitle("");
      setBody("");
      setImageData(null);
      setCtaLabel("");
      setCtaUrl("");
      load().catch(console.error);
    } catch (err) {
      setResult({ ok: false, text: err instanceof Error ? err.message : "Error al enviar" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <form onSubmit={send} className="flex flex-col gap-3">
        <p className="text-sm text-gray-600">
          Suscriptores: <b className="text-gray-900 tabular-nums">{subscribers ?? "—"}</b>
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

        <button disabled={sending || !subscribers} className="bg-blue-600 text-white p-2 rounded disabled:opacity-50">
          {sending ? "Enviando..." : subscribers === 0 ? "Aún no hay suscriptores" : "Enviar notificación"}
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

        {history.length > 0 && user && (
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
                  <a href={`/promo/${user.uid}/${n.id}`} target="_blank" className="text-xs text-blue-600">
                    Ver página{n.hasImage ? " (con foto)" : ""}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
