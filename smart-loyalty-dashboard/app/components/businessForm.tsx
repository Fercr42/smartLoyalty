"use client";
import { useEffect, useState } from "react";
import { db } from "../firebase/config";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useAuth } from "../contexts/AuthContext";
import { useI18n } from "../i18n/client";
import { isLocale, LOCALE_NAMES, LOCALES, type Locale } from "../i18n/config";
import { BUSINESS_TYPES, cleanBusinessType, type BusinessType } from "../lib/business-types";
import { DEFAULT_BG, DEFAULT_BRAND, safeColor, textOn } from "../lib/colors";
import { resizeImage } from "../lib/image";
import { syncWalletCards } from "../lib/walletClient";

// El logo se guarda reducido en Firestore (sin Firebase Storage, que exige plan Blaze)
// y se sirve desde /logo/{companyId}.

export default function BusinessForm() {
  const { user } = useAuth();
  const { m, f, locale } = useI18n();
  const t = m.business;
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [businessType, setBusinessType] = useState<BusinessType>("other");
  const [language, setLanguage] = useState<Locale>(locale);
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
        setBusinessType(cleanBusinessType(data.businessType));
        if (isLocale(data.language)) setLanguage(data.language);
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
      setMessage({ ok: false, text: err instanceof Error ? err.message : t.invalidImage });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!name.trim()) {
      setMessage({ ok: false, text: t.nameRequired });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const data: Record<string, string | null> = {
        name: name.trim(),
        description: description.trim(),
        businessType,
        language,
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
      // Nombre, logo, color o idioma cambian también en las tarjetas de Wallet ya guardadas.
      const updated = await syncWalletCards(user);
      setMessage({ ok: true, text: updated ? f(t.savedWallet, { count: updated }) : m.common.saved });
    } catch (err) {
      console.error(err);
      setMessage({ ok: false, text: m.common.networkError });
    } finally {
      setSaving(false);
    }
  };

  const label = "flex flex-col gap-1 text-sm text-gray-700";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-6 max-w-md mx-auto">
      <label htmlFor="company-name" className={label}>
        {t.name}
        <input id="company-name" value={name} onChange={(e) => setName(e.target.value)} className="border p-2 rounded" />
      </label>
      <label htmlFor="company-description" className={label}>
        {t.description}
        <textarea
          id="company-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="border p-2 rounded"
        />
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label htmlFor="company-type" className={label}>
          {t.type}
          <select
            id="company-type"
            value={businessType}
            onChange={(e) => setBusinessType(e.target.value as BusinessType)}
            className="border p-2 rounded bg-white"
          >
            {BUSINESS_TYPES.map((type) => (
              <option key={type} value={type}>
                {m.niches.types[type]}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor="company-language" className={label}>
          {t.language}
          <select
            id="company-language"
            value={language}
            onChange={(e) => setLanguage(e.target.value as Locale)}
            className="border p-2 rounded bg-white"
          >
            {LOCALES.map((l) => (
              <option key={l} value={l}>
                {LOCALE_NAMES[l]}
              </option>
            ))}
          </select>
        </label>
        <p className="sm:col-span-2 text-xs text-gray-500">{t.languageHint}</p>
      </div>
      <div className="flex items-center gap-3">
        {logoPreview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoPreview} alt={t.logo} className="w-16 h-16 rounded-lg object-cover border" />
        ) : (
          <div className="w-16 h-16 rounded-lg border border-dashed grid place-items-center text-xs text-gray-400">{t.logo}</div>
        )}
        <label className="border px-3 py-2 rounded text-sm cursor-pointer hover:bg-gray-100">
          {logoPreview ? t.changeLogo : t.uploadLogo}
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
        <label htmlFor="brand-color" className={label}>
          {t.buttonColor}
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
        <label htmlFor="bg-color" className={label}>
          {t.bgColor}
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
          {t.previewNote}
        </span>
        <span className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: brandColor, color: textOn(brandColor) }}>
          {t.previewButton}
        </span>
      </div>

      <button disabled={saving} className="bg-green-600 text-white p-2 rounded disabled:opacity-50">
        {saving ? m.common.saving : m.common.save}
      </button>
      {message && <p className={`text-sm ${message.ok ? "text-green-700" : "text-red-600"}`}>{message.text}</p>}
    </form>
  );
}
