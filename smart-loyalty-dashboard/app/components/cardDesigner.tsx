"use client";
import { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../contexts/AuthContext";
import {
  CARD_FONTS,
  CARD_TEMPLATES,
  cleanDesign,
  encodeDesign,
  templateDesign,
  type CardDesign,
  type CardSize,
} from "../lib/card-design";
import { compressImage, resizeImage } from "../lib/image";
import { useI18n } from "../i18n/client";
import { cleanRewards } from "../lib/rewards";
import { syncWalletCards } from "../lib/walletClient";

type Notice = { ok: boolean; text: string } | null;
const SIZES: CardSize[] = ["sm", "md", "lg"];
const ASSET_MAX_CHARS = 900_000; // un documento de Firestore admite máx. 1 MB

export default function CardDesigner() {
  const { user } = useAuth();
  const { m, f: tf } = useI18n();
  const t = m.cardDesign;
  const [design, setDesign] = useState<CardDesign | null>(null);
  const [brandColor, setBrandColor] = useState<string | undefined>();
  const [goal, setGoal] = useState(10);
  const [previewStamps, setPreviewStamps] = useState(6);
  const [previewParam, setPreviewParam] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, "companies", user.uid))
      .then((snap) => {
        const data = snap.data() ?? {};
        const rewardGoal = cleanRewards(data.loyalty?.rewards)[0]?.stamps ?? 10;
        setBrandColor(data.brandColor);
        setGoal(Math.min(rewardGoal, 20));
        setPreviewStamps(Math.max(1, Math.round(Math.min(rewardGoal, 20) * 0.6)));
        setDesign(data.cardDesign ? cleanDesign(data.cardDesign, data.brandColor) : templateDesign("classic", {}, data.brandColor));
      })
      .catch(console.error);
  }, [user]);

  // Vista previa: se redibuja un momento después del último cambio.
  useEffect(() => {
    if (!design) return;
    const timer = setTimeout(() => setPreviewParam(encodeDesign(design)), 350);
    return () => clearTimeout(timer);
  }, [design]);

  if (!user || !design) return <p className="text-sm text-gray-500">{t.loading}</p>;

  const update = (patch: Partial<CardDesign>) => setDesign((d) => (d ? { ...d, ...patch, template: patch.template ?? "custom" } : d));
  const imageUrl = (variant: "card" | "hero", p: string, stamps = previewStamps) =>
    `/card-image/${user.uid}?variant=${variant}&s=${stamps}&code=DEMO1234&p=${encodeURIComponent(p)}`;

  const upload = async (file: File | undefined, kind: "background" | "icon") => {
    if (!file) return;
    setUploading(true);
    setNotice(null);
    try {
      const data =
        kind === "background"
          ? await compressImage(file, 1400, ASSET_MAX_CHARS)
          : await resizeImage(file, 256, "image/png");
      if (data.length > ASSET_MAX_CHARS) throw new Error(t.tooHeavy);
      const assetId = kind === "background" ? "cardBackground" : "stampIcon";
      await setDoc(doc(db, "companies", user.uid, "assets", assetId), { data });
      const path = `/wallet-asset/${user.uid}/${kind === "background" ? "card-background" : "stamp-icon"}?v=${Date.now()}`;
      update(kind === "background" ? { bgImageUrl: path, bgType: "image" } : { stampIconUrl: path, stampIcon: "custom" });
    } catch (err) {
      setNotice({ ok: false, text: err instanceof Error ? err.message : t.uploadFailed });
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    setNotice(null);
    try {
      await setDoc(doc(db, "companies", user.uid), { cardDesign: { ...design, version: Date.now() } }, { merge: true });
      const updated = await syncWalletCards(user);
      setNotice(
        updated === null
          ? { ok: false, text: t.walletSyncFailed }
          : {
              ok: true,
              text: updated === 0 ? t.savedNone : updated === 1 ? t.savedOne : tf(t.savedMany, { count: updated }),
            }
      );
    } catch (err) {
      console.error(err);
      setNotice({ ok: false, text: m.common.networkError });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-gray-600 mb-3">{t.intro}</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {CARD_TEMPLATES.map((tpl) => {
            const thumb = templateDesign(tpl.id, design, brandColor);
            const name = t.templates[tpl.id as keyof typeof t.templates] ?? tpl.label;
            return (
              <button
                key={tpl.id}
                type="button"
                onClick={() => setDesign(templateDesign(tpl.id, design, brandColor))}
                className={`flex flex-col gap-1 rounded-lg p-1.5 border-2 text-left ${
                  design.template === tpl.id ? "border-gray-900" : "border-transparent hover:border-gray-300"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl("card", encodeDesign(thumb), Math.round(goal * 0.6))}
                  alt={tf(t.templateAlt, { name })}
                  loading="lazy"
                  className="w-full aspect-[1012/638] rounded-md bg-gray-100 object-cover"
                />
                <span className="text-xs font-medium text-gray-800 px-0.5">{name}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="flex flex-col gap-5">
          <fieldset className="border rounded-lg p-4 flex flex-col gap-3">
            <legend className="text-sm font-semibold text-gray-800 px-1">{t.background}</legend>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["solid", t.bgSolid],
                  ["gradient", t.bgGradient],
                  ["image", t.bgImage],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => update({ bgType: id })}
                  className={`px-3 py-1.5 rounded-full text-sm border ${
                    design.bgType === id ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-4">
              <ColorField id="design-bg" label={design.bgType === "gradient" ? t.color1 : t.bgColor} value={design.bgColor} onChange={(bgColor) => update({ bgColor })} />
              {design.bgType === "gradient" && (
                <>
                  <ColorField id="design-bg2" label={t.color2} value={design.bgColor2} onChange={(bgColor2) => update({ bgColor2 })} />
                  <label htmlFor="design-angle" className="flex flex-col gap-1 text-xs text-gray-600">
                    {t.direction}
                    <input id="design-angle" type="range" min={0} max={360} step={15} value={design.bgAngle} onChange={(e) => update({ bgAngle: Number(e.target.value) })} />
                  </label>
                </>
              )}
            </div>
            {design.bgType === "image" && (
              <div className="flex flex-col gap-2">
                <label className="self-start border px-3 py-2 rounded text-sm cursor-pointer hover:bg-gray-100">
                  {uploading ? t.uploading : design.bgImageUrl ? t.changeBg : t.uploadBg}
                  <input
                    id="design-bg-image"
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    disabled={uploading}
                    onChange={(e) => {
                      upload(e.target.files?.[0], "background");
                      e.target.value = "";
                    }}
                  />
                </label>
                <label htmlFor="design-overlay" className="flex flex-col gap-1 text-xs text-gray-600">
                  {t.overlay}
                  <input id="design-overlay" type="range" min={0} max={0.8} step={0.05} value={design.bgOverlay} onChange={(e) => update({ bgOverlay: Number(e.target.value) })} />
                </label>
              </div>
            )}
          </fieldset>

          <fieldset className="border rounded-lg p-4 flex flex-col gap-3">
            <legend className="text-sm font-semibold text-gray-800 px-1">{t.textAndFont}</legend>
            <div className="flex flex-wrap gap-4">
              <ColorField id="design-text" label={t.textColor} value={design.textColor} onChange={(textColor) => update({ textColor })} />
              <ColorField id="design-accent" label={t.stampColor} value={design.accentColor} onChange={(accentColor) => update({ accentColor })} />
            </div>
            <label htmlFor="design-font" className="flex flex-col gap-1 text-xs text-gray-600">
              {t.font}
              <select id="design-font" value={design.font} onChange={(e) => update({ font: e.target.value })} className="border rounded p-2 text-sm text-gray-900">
                {CARD_FONTS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <SizeField id="design-logo-size" label={t.logoSize} value={design.logoSize} onChange={(logoSize) => update({ logoSize })} />
              <SizeField id="design-title-size" label={t.titleSize} value={design.titleSize} onChange={(titleSize) => update({ titleSize })} />
            </div>
          </fieldset>

          <fieldset className="border rounded-lg p-4 flex flex-col gap-3">
            <legend className="text-sm font-semibold text-gray-800 px-1">{t.stamps}</legend>
            <label htmlFor="design-preview-stamps" className="flex flex-col gap-1 text-xs text-gray-600">
              {tf(t.tryStamps, { count: previewStamps, goal })}
              <input id="design-preview-stamps" type="range" min={0} max={goal} value={previewStamps} onChange={(e) => setPreviewStamps(Number(e.target.value))} />
            </label>
          </fieldset>

          <label htmlFor="design-wallet" className="flex items-start gap-2 text-sm text-gray-800">
            <input id="design-wallet" type="checkbox" checked={design.useInWallet} onChange={(e) => update({ useInWallet: e.target.checked })} className="mt-1" />
            <span>
              {t.useInWallet}
              <span className="block text-xs text-gray-500">{t.useInWalletHint}</span>
            </span>
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <button onClick={save} disabled={saving || uploading} className="bg-green-600 text-white px-5 py-2 rounded disabled:opacity-50">
              {saving ? m.common.saving : t.save}
            </button>
            {notice && <p className={`text-sm ${notice.ok ? "text-green-700" : "text-red-600"}`}>{notice.text}</p>}
          </div>
        </div>

        <div className="flex flex-col gap-4 lg:sticky lg:top-6 self-start w-full">
          <p className="text-xs uppercase tracking-wide text-gray-500">{t.previewCard}</p>
          {previewParam ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={`card-${previewParam}-${previewStamps}`}
              src={imageUrl("card", previewParam)}
              alt={t.previewCardAlt}
              className="w-full aspect-[1012/638] rounded-2xl shadow-lg bg-gray-100"
            />
          ) : (
            <div className="w-full aspect-[1012/638] rounded-2xl bg-gray-100 animate-pulse" />
          )}
          <p className="text-xs uppercase tracking-wide text-gray-500">{t.previewHero}</p>
          {previewParam ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={`hero-${previewParam}-${previewStamps}`}
              src={imageUrl("hero", previewParam)}
              alt={t.previewHeroAlt}
              className="w-full max-w-md aspect-[1032/336] rounded-xl shadow bg-gray-100"
            />
          ) : (
            <div className="w-full max-w-md aspect-[1032/336] rounded-xl bg-gray-100 animate-pulse" />
          )}
          <p className="text-xs text-gray-500">{t.footnote}</p>
        </div>
      </div>
    </div>
  );
}

function ColorField({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1 text-xs text-gray-600">
      {label}
      <span className="flex items-center gap-2 border rounded p-1.5">
        <input id={id} type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-8 w-10 cursor-pointer bg-transparent" />
        <span className="font-mono text-xs uppercase text-gray-800">{value}</span>
      </span>
    </label>
  );
}

function SizeField({ id, label, value, onChange }: { id: string; label: string; value: CardSize; onChange: (v: CardSize) => void }) {
  const { m } = useI18n();
  return (
    <label htmlFor={id} className="flex flex-col gap-1 text-xs text-gray-600">
      {label}
      <select id={id} value={value} onChange={(e) => onChange(e.target.value as CardSize)} className="border rounded p-2 text-sm text-gray-900">
        {SIZES.map((s) => (
          <option key={s} value={s}>
            {m.cardDesign.sizes[s]}
          </option>
        ))}
      </select>
    </label>
  );
}
