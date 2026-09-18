"use client";
import { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { QRCodeSVG } from "qrcode.react";
import { db } from "../firebase/config";
import { useAuth } from "../contexts/AuthContext";
import { DEFAULT_BRAND, safeColor, textOn } from "../lib/colors";
import { compressImage, resizeImage } from "../lib/image";
import { useI18n } from "../i18n/client";
import { describeLink } from "../lib/links";
import { parseMapsLink, validLocation, type LatLng } from "../lib/location";
import { syncWalletCards } from "../lib/walletClient";

type InfoRow = { label: string; value: string };
type LinkRow = { label: string; url: string };

const LINK = /^(https:\/\/|tel:|mailto:)\S+$/;
const HERO_MAX_CHARS = 900_000; // un documento de Firestore admite máx. 1 MB

const threeInfo = (rows?: InfoRow[]) => [0, 1, 2].map((i) => rows?.[i] ?? { label: "", value: "" });
const threeLinks = (rows?: LinkRow[]) => [0, 1, 2].map((i) => rows?.[i] ?? { label: "", url: "" });

export default function WalletCardEditor() {
  const { user } = useAuth();
  const { m, f } = useI18n();
  const t = m.walletCard;
  const [company, setCompany] = useState({ name: "", logoUrl: "" });
  const [color, setColor] = useState(DEFAULT_BRAND);
  const [header, setHeader] = useState("");
  const [subheader, setSubheader] = useState("");
  const [heroUrl, setHeroUrl] = useState("");
  const [heroData, setHeroData] = useState<string | null>(null);
  const [wideLogoUrl, setWideLogoUrl] = useState("");
  const [wideLogoData, setWideLogoData] = useState<string | null>(null);
  const [location, setLocation] = useState<LatLng | null>(null);
  const [mapsLink, setMapsLink] = useState("");
  const [locating, setLocating] = useState(false);
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
        setWideLogoUrl(card.wideLogoUrl ?? "");
        setLocation(validLocation(data.location));
        setInfo(threeInfo(card.info));
        setLinks(threeLinks(card.links));
      })
      .catch(console.error);
  }, [user]);

  const heroPreview = heroData ?? heroUrl;
  const fg = textOn(color);

  const wideLogoPreview = wideLogoData ?? wideLogoUrl;

  const locateMe = () => {
    setMessage(null);
    if (!navigator.geolocation) {
      setMessage({ ok: false, text: t.noGeolocation });
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setMapsLink("");
        setLocating(false);
      },
      () => {
        setLocating(false);
        setMessage({ ok: false, text: t.locationFailed });
      },
      { enableHighAccuracy: true, timeout: 15_000 }
    );
  };

  // PNG para conservar la transparencia; se achica hasta que quepa en Firestore.
  const handleWideLogo = async (file: File | undefined) => {
    setMessage(null);
    if (!file) return;
    try {
      for (const size of [1280, 960, 640, 480]) {
        const data = await resizeImage(file, size, "image/png");
        if (data.length <= HERO_MAX_CHARS) {
          setWideLogoData(data);
          return;
        }
      }
      throw new Error(t.logoTooHeavy);
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : t.invalidImage });
    }
  };

  const handleHero = async (file: File | undefined) => {
    setMessage(null);
    if (!file) return;
    try {
      setHeroData(await compressImage(file, 1032, HERO_MAX_CHARS));
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : t.invalidImage });
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
      setMessage({ ok: false, text: t.saveBusinessFirst });
      return;
    }
    const badLink = links.find((l) => l.url.trim() && !LINK.test(l.url.trim()));
    if (badLink) {
      setMessage({
        ok: false,
        text: f(t.badLink, { link: badLink.label || badLink.url }),
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
      let nextWideLogoUrl = wideLogoUrl;
      if (wideLogoData) {
        await setDoc(doc(db, "companies", user.uid, "assets", "walletWideLogo"), { data: wideLogoData });
        nextWideLogoUrl = `/wallet-asset/${user.uid}/wide-logo?v=${Date.now()}`;
      }
      await setDoc(
        doc(db, "companies", user.uid),
        {
          walletCard: {
            color,
            header: header.trim(),
            subheader: subheader.trim(),
            heroUrl: nextHeroUrl,
            wideLogoUrl: nextWideLogoUrl,
            info: info
              .map((r) => ({ label: r.label.trim(), value: r.value.trim() }))
              .filter((r) => r.label && r.value),
            links: links
              .map((l) => ({ label: l.label.trim(), url: l.url.trim() }))
              .filter((l) => l.url),
          },
          location: location ?? null,
        },
        { merge: true }
      );
      setHeroUrl(nextHeroUrl);
      setHeroData(null);
      setWideLogoUrl(nextWideLogoUrl);
      setWideLogoData(null);

      const updated = await syncWalletCards(user);
      setMessage(
        updated === null
          ? { ok: false, text: t.syncFailed }
          : { ok: true, text: updated ? f(t.savedCount, { count: updated }) : m.common.saved }
      );
    } catch (err) {
      console.error(err);
      setMessage({ ok: false, text: m.common.networkError });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      <form onSubmit={save} className="flex flex-col gap-4 min-w-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label htmlFor="wallet-header" className="flex flex-col gap-1 text-sm text-gray-700">
            {t.header}
            <input
              id="wallet-header"
              placeholder={t.headerPlaceholder}
              value={header}
              maxLength={40}
              onChange={(e) => setHeader(e.target.value)}
              className="border p-2 rounded"
            />
          </label>
          <label htmlFor="wallet-subheader" className="flex flex-col gap-1 text-sm text-gray-700">
            {t.subheader}
            <input
              id="wallet-subheader"
              placeholder={t.subheaderPlaceholder}
              value={subheader}
              maxLength={40}
              onChange={(e) => setSubheader(e.target.value)}
              className="border p-2 rounded"
            />
          </label>
        </div>

        <div className="flex flex-wrap items-end gap-4">
          <label htmlFor="wallet-color" className="flex flex-col gap-1 text-sm text-gray-700">
            {t.color}
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
              {heroPreview ? t.changeHero : t.addHero}
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
                {t.removeHero}
              </button>
            )}
          </div>
        </div>
        <p className="text-xs text-gray-500 -mt-2">{t.heroHint}</p>

        <div className="flex flex-col gap-2 border rounded p-3">
          <p className="text-sm text-gray-700">{t.wideLogo}</p>
          <div className="flex flex-wrap items-center gap-3">
            <label className="border px-3 py-2 rounded text-sm cursor-pointer hover:bg-gray-100">
              {wideLogoPreview ? t.changeWideLogo : t.uploadWideLogo}
              <input
                id="wallet-wide-logo"
                type="file"
                accept="image/png,image/webp,image/jpeg"
                className="sr-only"
                onChange={(e) => {
                  handleWideLogo(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
            {wideLogoPreview && (
              <button
                type="button"
                onClick={() => {
                  setWideLogoData(null);
                  setWideLogoUrl("");
                }}
                className="text-sm text-red-600"
              >
                {t.removeWideLogo}
              </button>
            )}
          </div>
          <p className="text-xs text-gray-500">{t.wideLogoHint}</p>
        </div>

        <fieldset className="border rounded p-3 flex flex-col gap-2">
          <legend className="text-sm text-gray-600 px-1">{t.info}</legend>
          {info.map((row, i) => (
            <div key={i} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-2">
              <input
                id={`wallet-info-label-${i}`}
                placeholder={t.infoHints[i][0]}
                value={row.label}
                maxLength={40}
                onChange={(e) => updateInfo(i, "label", e.target.value)}
                className="border p-2 rounded min-w-0"
              />
              <input
                id={`wallet-info-value-${i}`}
                placeholder={t.infoHints[i][1]}
                value={row.value}
                maxLength={200}
                onChange={(e) => updateInfo(i, "value", e.target.value)}
                className="border p-2 rounded min-w-0"
              />
            </div>
          ))}
        </fieldset>

        <fieldset className="border rounded p-3 flex flex-col gap-2">
          <legend className="text-sm text-gray-600 px-1">{t.links}</legend>
          {links.map((row, i) => (
            <div key={i} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-2">
              <input
                id={`wallet-link-label-${i}`}
                placeholder={t.linkHints[i][0]}
                value={row.label}
                maxLength={40}
                onChange={(e) => updateLink(i, "label", e.target.value)}
                className="border p-2 rounded min-w-0"
              />
              <input
                id={`wallet-link-url-${i}`}
                placeholder={t.linkHints[i][1]}
                value={row.url}
                onChange={(e) => updateLink(i, "url", e.target.value)}
                className="border p-2 rounded min-w-0"
              />
            </div>
          ))}
          <p className="text-xs text-gray-500">{t.linksHint}</p>
        </fieldset>

        <fieldset className="border rounded p-3 flex flex-col gap-2">
          <legend className="text-sm text-gray-600 px-1">{t.location}</legend>
          <p className="text-xs text-gray-500">{t.locationHint}</p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={locateMe}
              disabled={locating}
              className="border px-3 py-2 rounded text-sm hover:bg-gray-100 disabled:opacity-50"
            >
              {locating ? t.locating : t.useMyLocation}
            </button>
            {location && (
              <button
                type="button"
                onClick={() => {
                  setLocation(null);
                  setMapsLink("");
                }}
                className="text-sm text-red-600"
              >
                {t.removeLocation}
              </button>
            )}
          </div>
          <input
            id="wallet-maps-link"
            placeholder={t.mapsPlaceholder}
            value={mapsLink}
            onChange={(e) => {
              setMapsLink(e.target.value);
              const parsed = parseMapsLink(e.target.value);
              if (parsed) setLocation(parsed);
            }}
            className="border p-2 rounded"
          />
          {mapsLink.trim() && !parseMapsLink(mapsLink) && (
            <p className="text-xs text-red-600">{t.mapsInvalid}</p>
          )}
          {location && (
            <p className="text-sm text-gray-700 tabular-nums">
              {location.lat.toFixed(5)}, {location.lng.toFixed(5)} ·{" "}
              <a
                href={`https://www.google.com/maps?q=${location.lat},${location.lng}`}
                target="_blank"
                className="text-blue-700"
              >
                {t.viewMap}
              </a>
            </p>
          )}
        </fieldset>

        <button disabled={saving} className="bg-green-600 text-white p-2 rounded disabled:opacity-50">
          {saving ? t.saving : t.save}
        </button>
        {message && (
          <p className={`text-sm ${message.ok ? "text-green-700" : "text-red-600"}`}>{message.text}</p>
        )}
      </form>

      <div className="flex flex-col gap-4 lg:sticky lg:top-6 self-start w-full">
        <p className="text-xs uppercase tracking-wide text-gray-500">{t.preview}</p>
        <div
          className="rounded-2xl overflow-hidden shadow-md w-full max-w-[340px] mx-auto"
          style={{ background: color, color: fg }}
        >
          {wideLogoPreview ? (
            <div className="px-4 pt-4 pb-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={wideLogoPreview} alt="" className="h-14 max-w-full object-contain object-left" />
            </div>
          ) : (
            <div className="p-4 flex items-center gap-3">
              {company.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={company.logoUrl} alt="" className="w-9 h-9 rounded-full object-cover bg-white" />
              ) : (
                <div className="w-9 h-9 rounded-full" style={{ background: fg, opacity: 0.25 }} />
              )}
              <span className="text-sm font-medium truncate">{company.name || t.yourBusiness}</span>
            </div>
          )}
          <div className="px-4 pb-4">
            <p className="text-xs" style={{ opacity: 0.8 }}>{subheader || t.subheaderPlaceholder}</p>
            <p className="text-2xl font-semibold leading-tight break-words">{header || t.headerPlaceholder}</p>
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
          <p className="px-4 py-2 text-xs uppercase tracking-wide text-gray-500">{t.details}</p>
          {info
            .filter((r) => r.label.trim() && r.value.trim())
            .map((r, i) => (
              <div key={`i${i}`} className="px-4 py-2">
                <p className="text-xs text-gray-500">{r.label}</p>
                <p className="text-gray-900 break-words">{r.value}</p>
              </div>
            ))}
          {[
            ...links.filter((l) => l.url.trim()).map((l) => describeLink(l.label.trim(), l.url.trim(), m.pass)),
            t.promotions,
          ].map((label, i) => (
            <p key={`l${i}`} className="px-4 py-2 text-blue-700">{label}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
