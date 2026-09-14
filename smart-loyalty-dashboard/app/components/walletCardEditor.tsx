"use client";
import { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { QRCodeSVG } from "qrcode.react";
import { db } from "../firebase/config";
import { useAuth } from "../contexts/AuthContext";
import { DEFAULT_BRAND, safeColor, textOn } from "../lib/colors";
import { compressImage } from "../lib/image";
import { syncWalletCards } from "../lib/walletClient";

type InfoRow = { label: string; value: string };
type LinkRow = { label: string; url: string };

const INFO_HINTS = [
  ["Horario", "Lun a Dom · 1 pm a 11 pm"],
  ["Dirección", "Av. Principal 123, Centro"],
  ["Teléfono", "+52 55 1234 5678"],
];
const LINK_HINTS = [
  ["Ver menú", "https://..."],
  ["WhatsApp", "https://wa.me/5215512345678"],
  ["Llamar", "tel:+525512345678"],
];
const LINK = /^(https:\/\/|tel:|mailto:)\S+$/;
const HERO_MAX_CHARS = 900_000; // un documento de Firestore admite máx. 1 MB

const threeInfo = (rows?: InfoRow[]) => [0, 1, 2].map((i) => rows?.[i] ?? { label: "", value: "" });
const threeLinks = (rows?: LinkRow[]) => [0, 1, 2].map((i) => rows?.[i] ?? { label: "", url: "" });

export default function WalletCardEditor() {
  const { user } = useAuth();
  const [company, setCompany] = useState({ name: "", logoUrl: "" });
  const [color, setColor] = useState(DEFAULT_BRAND);
  const [header, setHeader] = useState("");
  const [subheader, setSubheader] = useState("");
  const [heroUrl, setHeroUrl] = useState("");
  const [heroData, setHeroData] = useState<string | null>(null);
  const [info, setInfo] = useState<InfoRow[]>(threeInfo());
  const [links, setLinks] = useState<LinkRow[]>(threeLinks());
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, "companies", user.uid))
      .then((snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        const card = data.walletCard ?? {};
        setCompany({ name: data.name ?? "", logoUrl: data.logoUrl ?? "" });
        setColor(safeColor(card.color, safeColor(data.brandColor, DEFAULT_BRAND)));
        setHeader(card.header ?? "");
        setSubheader(card.subheader ?? "");
        setHeroUrl(card.heroUrl ?? "");
        setInfo(threeInfo(card.info));
        setLinks(threeLinks(card.links));
      })
      .catch(console.error);
  }, [user]);

  const heroPreview = heroData ?? heroUrl;
  const fg = textOn(color);

  const handleHero = async (file: File | undefined) => {
    setMessage(null);
    if (!file) return;
    try {
      setHeroData(await compressImage(file, 1032, HERO_MAX_CHARS));
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Imagen inválida" });
    }
  };

  const updateInfo = (i: number, key: keyof InfoRow, value: string) =>
    setInfo((rows) => rows.map((row, n) => (n === i ? { ...row, [key]: value } : row)));
  const updateLink = (i: number, key: keyof LinkRow, value: string) =>
    setLinks((rows) => rows.map((row, n) => (n === i ? { ...row, [key]: value } : row)));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!company.name) {
      setMessage({ ok: false, text: "Primero guarda los datos del restaurante (arriba)." });
      return;
    }
    const badLink = links.find((l) => l.url.trim() && !LINK.test(l.url.trim()));
    if (badLink) {
      setMessage({
        ok: false,
        text: `El enlace "${badLink.label || badLink.url}" debe empezar con https://, tel: o mailto:`,
      });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      let nextHeroUrl = heroUrl;
      if (heroData) {
        await setDoc(doc(db, "companies", user.uid, "assets", "walletHero"), { data: heroData });
        nextHeroUrl = `/wallet-hero/${user.uid}?v=${Date.now()}`;
      }
      await setDoc(
        doc(db, "companies", user.uid),
        {
          walletCard: {
            color,
            header: header.trim(),
            subheader: subheader.trim(),
            heroUrl: nextHeroUrl,
            info: info
              .map((r) => ({ label: r.label.trim(), value: r.value.trim() }))
              .filter((r) => r.label && r.value),
            links: links
              .map((l) => ({ label: l.label.trim(), url: l.url.trim() }))
              .filter((l) => l.url),
          },
        },
        { merge: true }
      );
      setHeroUrl(nextHeroUrl);
      setHeroData(null);

      const updated = await syncWalletCards(user);
      setMessage(
        updated === null
          ? { ok: false, text: "Guardado, pero no se pudieron actualizar las tarjetas que ya tienen tus clientes." }
          : { ok: true, text: `Guardado${updated ? ` · ${updated} tarjetas actualizadas` : ""}.` }
      );
    } catch (err) {
      console.error(err);
      setMessage({ ok: false, text: "No se pudo guardar. Revisa tu conexión e inténtalo de nuevo." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <form onSubmit={save} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label htmlFor="wallet-header" className="flex flex-col gap-1 text-sm text-gray-700">
            Texto principal
            <input
              id="wallet-header"
              placeholder="Cliente frecuente"
              value={header}
              maxLength={40}
              onChange={(e) => setHeader(e.target.value)}
              className="border p-2 rounded"
            />
          </label>
          <label htmlFor="wallet-subheader" className="flex flex-col gap-1 text-sm text-gray-700">
            Texto secundario
            <input
              id="wallet-subheader"
              placeholder="Membresía"
              value={subheader}
              maxLength={40}
              onChange={(e) => setSubheader(e.target.value)}
              className="border p-2 rounded"
            />
          </label>
        </div>

        <div className="flex flex-wrap items-end gap-4">
          <label htmlFor="wallet-color" className="flex flex-col gap-1 text-sm text-gray-700">
            Color de la tarjeta
            <span className="flex items-center gap-2 border rounded p-1.5">
              <input
                id="wallet-color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-8 w-10 cursor-pointer bg-transparent"
              />
              <span className="font-mono text-xs uppercase">{color}</span>
            </span>
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <label className="border px-3 py-2 rounded text-sm cursor-pointer hover:bg-gray-100">
              {heroPreview ? "Cambiar portada" : "Agregar portada"}
              <input
                id="wallet-hero"
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  handleHero(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
            {heroPreview && (
              <button
                type="button"
                onClick={() => {
                  setHeroData(null);
                  setHeroUrl("");
                }}
                className="text-sm text-red-600"
              >
                Quitar portada
              </button>
            )}
          </div>
        </div>
        <p className="text-xs text-gray-500 -mt-2">Portada: foto horizontal, ideal 1032 × 336 px.</p>

        <fieldset className="border rounded p-3 flex flex-col gap-2">
          <legend className="text-sm text-gray-600 px-1">Datos en la tarjeta (opcional)</legend>
          {info.map((row, i) => (
            <div key={i} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-2">
              <input
                id={`wallet-info-label-${i}`}
                placeholder={INFO_HINTS[i][0]}
                value={row.label}
                maxLength={40}
                onChange={(e) => updateInfo(i, "label", e.target.value)}
                className="border p-2 rounded min-w-0"
              />
              <input
                id={`wallet-info-value-${i}`}
                placeholder={INFO_HINTS[i][1]}
                value={row.value}
                maxLength={200}
                onChange={(e) => updateInfo(i, "value", e.target.value)}
                className="border p-2 rounded min-w-0"
              />
            </div>
          ))}
        </fieldset>

        <fieldset className="border rounded p-3 flex flex-col gap-2">
          <legend className="text-sm text-gray-600 px-1">Botones con enlace (opcional)</legend>
          {links.map((row, i) => (
            <div key={i} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-2">
              <input
                id={`wallet-link-label-${i}`}
                placeholder={LINK_HINTS[i][0]}
                value={row.label}
                maxLength={40}
                onChange={(e) => updateLink(i, "label", e.target.value)}
                className="border p-2 rounded min-w-0"
              />
              <input
                id={`wallet-link-url-${i}`}
                placeholder={LINK_HINTS[i][1]}
                value={row.url}
                onChange={(e) => updateLink(i, "url", e.target.value)}
                className="border p-2 rounded min-w-0"
              />
            </div>
          ))}
          <p className="text-xs text-gray-500">Se agrega solo un botón &quot;Promociones&quot; con tu página del QR.</p>
        </fieldset>

        <button disabled={saving} className="bg-green-600 text-white p-2 rounded disabled:opacity-50">
          {saving ? "Guardando y actualizando tarjetas..." : "Guardar tarjeta"}
        </button>
        {message && (
          <p className={`text-sm ${message.ok ? "text-green-700" : "text-red-600"}`}>{message.text}</p>
        )}
      </form>

      <div className="flex flex-col gap-4 lg:sticky lg:top-6 self-start w-full">
        <p className="text-xs uppercase tracking-wide text-gray-500">Vista previa</p>
        <div
          className="rounded-2xl overflow-hidden shadow-md w-full max-w-[340px] mx-auto"
          style={{ background: color, color: fg }}
        >
          <div className="p-4 flex items-center gap-3">
            {company.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={company.logoUrl} alt="" className="w-9 h-9 rounded-full object-cover bg-white" />
            ) : (
              <div className="w-9 h-9 rounded-full" style={{ background: fg, opacity: 0.25 }} />
            )}
            <span className="text-sm font-medium truncate">{company.name || "Tu restaurante"}</span>
          </div>
          <div className="px-4 pb-4">
            <p className="text-xs" style={{ opacity: 0.8 }}>{subheader || "Membresía"}</p>
            <p className="text-2xl font-semibold leading-tight break-words">{header || "Cliente frecuente"}</p>
          </div>
          <div className="flex justify-center pb-5">
            <div className="bg-white p-2.5 rounded-xl">
              <QRCodeSVG value="smart-loyalty-vista-previa" size={110} />
            </div>
          </div>
          {heroPreview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={heroPreview} alt="" className="w-full aspect-[1032/336] object-cover" />
          )}
        </div>

        <div className="w-full max-w-[340px] mx-auto rounded-xl border bg-white divide-y text-sm">
          <p className="px-4 py-2 text-xs uppercase tracking-wide text-gray-500">Detalles (al abrir la tarjeta)</p>
          {info
            .filter((r) => r.label.trim() && r.value.trim())
            .map((r, i) => (
              <div key={`i${i}`} className="px-4 py-2">
                <p className="text-xs text-gray-500">{r.label}</p>
                <p className="text-gray-900 break-words">{r.value}</p>
              </div>
            ))}
          {[...links.filter((l) => l.url.trim()).map((l) => l.label || "Abrir"), "Promociones"].map((label, i) => (
            <p key={`l${i}`} className="px-4 py-2 text-blue-700">{label}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
