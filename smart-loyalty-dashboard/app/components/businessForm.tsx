"use client";
import { useEffect, useState } from "react";
import { db } from "../firebase/config";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useAuth } from "../contexts/AuthContext";
import { DEFAULT_BG, DEFAULT_BRAND, safeColor, textOn } from "../lib/colors";
import { resizeImage } from "../lib/image";
import { syncWalletCards } from "../lib/walletClient";

// El logo se guarda reducido en Firestore (sin Firebase Storage, que exige plan Blaze)
// y se sirve desde /logo/{companyId}.

export default function BusinessForm() {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [brandColor, setBrandColor] = useState(DEFAULT_BRAND);
  const [bgColor, setBgColor] = useState(DEFAULT_BG);
  const [logoData, setLogoData] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, "companies", user.uid))
      .then((snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        setName(data.name ?? "");
        setDescription(data.description ?? "");
        setLogoPreview(data.logoUrl ?? "");
        setBrandColor(safeColor(data.brandColor, DEFAULT_BRAND));
        setBgColor(safeColor(data.bgColor, DEFAULT_BG));
      })
      .catch(console.error);
  }, [user]);

  const handleLogo = async (file: File | undefined) => {
    setMessage(null);
    if (!file) return;
    try {
      const data = await resizeImage(file, 256, "image/png");
      setLogoData(data);
      setLogoPreview(data);
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Imagen inválida" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!name.trim()) {
      setMessage({ ok: false, text: "Escribe el nombre del restaurante." });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const data: Record<string, string | null> = {
        name: name.trim(),
        description: description.trim(),
        brandColor,
        bgColor,
        owner: user.email,
      };
      if (logoData) {
        data.logoData = logoData;
        data.logoUrl = `/logo/${user.uid}?v=${Date.now()}`;
      }
      // merge: no borrar el logo si no se sube uno nuevo.
      await setDoc(doc(db, "companies", user.uid), data, { merge: true });
      if (data.logoUrl) setLogoPreview(data.logoUrl);
      setLogoData(null);
      // Nombre, logo o color cambian también en las tarjetas de Wallet ya guardadas.
      const updated = await syncWalletCards(user);
      setMessage({ ok: true, text: `Guardado${updated ? ` · ${updated} tarjetas de Wallet actualizadas` : ""}.` });
    } catch (err) {
      console.error(err);
      setMessage({ ok: false, text: "No se pudo guardar. Revisa tu conexión e inténtalo de nuevo." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-6 max-w-md mx-auto">
      <input
        id="company-name"
        placeholder="Nombre de la empresa"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="border p-2 rounded"
      />
      <textarea
        id="company-description"
        placeholder="Descripción"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="border p-2 rounded"
      />
      <div className="flex items-center gap-3">
        {logoPreview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoPreview} alt="Logo" className="w-16 h-16 rounded-lg object-cover border" />
        ) : (
          <div className="w-16 h-16 rounded-lg border border-dashed grid place-items-center text-xs text-gray-400">
            Logo
          </div>
        )}
        <label className="border px-3 py-1.5 rounded text-sm cursor-pointer hover:bg-gray-100">
          {logoPreview ? "Cambiar logo" : "Subir logo"}
          <input
            id="company-logo"
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => handleLogo(e.target.files?.[0])}
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label htmlFor="brand-color" className="flex flex-col gap-1 text-sm text-gray-700">
          Color de botones
          <span className="flex items-center gap-2 border rounded p-1.5">
            <input
              id="brand-color"
              type="color"
              value={brandColor}
              onChange={(e) => setBrandColor(e.target.value)}
              className="h-8 w-10 cursor-pointer bg-transparent"
            />
            <span className="font-mono text-xs uppercase">{brandColor}</span>
          </span>
        </label>
        <label htmlFor="bg-color" className="flex flex-col gap-1 text-sm text-gray-700">
          Color de fondo
          <span className="flex items-center gap-2 border rounded p-1.5">
            <input
              id="bg-color"
              type="color"
              value={bgColor}
              onChange={(e) => setBgColor(e.target.value)}
              className="h-8 w-10 cursor-pointer bg-transparent"
            />
            <span className="font-mono text-xs uppercase">{bgColor}</span>
          </span>
        </label>
      </div>

      <div className="rounded-lg p-4 flex flex-col items-center gap-2 border" style={{ background: bgColor }}>
        <span className="text-xs" style={{ color: textOn(bgColor) }}>
          Así se verá tu página del QR y de promociones
        </span>
        <span
          className="px-4 py-2 rounded-lg text-sm font-semibold"
          style={{ background: brandColor, color: textOn(brandColor) }}
        >
          Activar notificaciones
        </span>
      </div>

      <button disabled={saving} className="bg-green-600 text-white p-2 rounded disabled:opacity-50">
        {saving ? "Guardando..." : "Guardar"}
      </button>
      {message && (
        <p className={`text-sm ${message.ok ? "text-green-700" : "text-red-600"}`}>{message.text}</p>
      )}
    </form>
  );
}
