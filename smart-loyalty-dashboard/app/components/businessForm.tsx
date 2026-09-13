"use client";
import { useEffect, useState } from "react";
import { db } from "../firebase/config";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useAuth } from "../contexts/AuthContext";

// El logo se guarda reducido en Firestore (sin Firebase Storage, que exige plan Blaze)
// y se sirve desde /logo/{companyId}.
const MAX_SIZE = 256;

function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, MAX_SIZE / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(img.src);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => reject(new Error("No se pudo leer la imagen"));
    img.src = URL.createObjectURL(file);
  });
}

export default function BusinessForm() {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
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
      })
      .catch(console.error);
  }, [user]);

  const handleLogo = async (file: File | undefined) => {
    setMessage(null);
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMessage({ ok: false, text: "El logo debe ser una imagen (PNG, JPG o WebP)." });
      return;
    }
    try {
      const data = await resizeImage(file);
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
      setMessage({ ok: true, text: "Guardado." });
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
      <button disabled={saving} className="bg-green-600 text-white p-2 rounded disabled:opacity-50">
        {saving ? "Guardando..." : "Guardar"}
      </button>
      {message && (
        <p className={`text-sm ${message.ok ? "text-green-700" : "text-red-600"}`}>{message.text}</p>
      )}
    </form>
  );
}
