"use client";
import { useCallback, useEffect, useState } from "react";
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { getMessaging, getToken, isSupported, onMessage } from "firebase/messaging";
import { QRCodeSVG } from "qrcode.react";
import { app, db } from "../firebase/config";
import { DEFAULT_BG, DEFAULT_BRAND, safeColor, textOn } from "../lib/colors";
import { formatDay } from "../lib/format";
import { getMemberId, setMemberId } from "../lib/member-id";
import ProtectCard from "./protectCard";
import { LanguageSwitcher, useI18n } from "../i18n/client";
import { nextRewardText, type Reward } from "../lib/rewards";

type Company = {
  name: string;
  description?: string;
  logoUrl?: string;
  brandColor?: string;
  bgColor?: string;
  loyalty?: { rewards?: unknown; mode?: unknown; rule?: unknown; currency?: unknown };
  cardDesign?: { version?: number };
};
type Status =
  | "loading"
  | "notfound"
  | "ready"
  | "ios-install"
  | "unsupported"
  | "denied"
  | "subscribing"
  | "subscribed"
  | "error";
type MemberCard = {
  memberId: string;
  code: string;
  stamps: number;
  rewards: Reward[];
  coupons: { id: string; title: string; expiresDate: string; used: boolean }[];
  birthday: string | null;
  birthdayEnabled: boolean;
  birthdayGift: string;
  linked: boolean;
  email: string | null;
};

// Nombres de los meses y fecha de cumpleaños en el idioma del cliente.
const monthNames = (dateLocale: string) =>
  Array.from({ length: 12 }, (_, i) => new Date(2024, i, 1).toLocaleDateString(dateLocale, { month: "long" }));
const formatBirthday = (mmdd: string, dateLocale: string) => {
  const [month, day] = mmdd.split("-").map(Number);
  return new Date(2024, month - 1, day).toLocaleDateString(dateLocale, { day: "numeric", month: "long" });
};

const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent);
const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;


// Token de notificaciones guardado en este celular, para no contarlo dos veces ni dejarlo si se bloquean.
const tokenKey = (companyId: string) => `push-token:${companyId}`;
function storedToken(companyId: string) {
  try {
    return localStorage.getItem(tokenKey(companyId)) ?? "";
  } catch {
    return "";
  }
}
function storeToken(companyId: string, token: string | null) {
  try {
    if (token) localStorage.setItem(tokenKey(companyId), token);
    else localStorage.removeItem(tokenKey(companyId));
  } catch {}
}
function deleteSubscriber(companyId: string, token: string) {
  return deleteDoc(doc(db, "companies", companyId, "subscribers", token)).catch(() => {});
}

export default function JoinClient({
  companyId,
  walletEnabled,
}: {
  companyId: string;
  walletEnabled: boolean;
}) {
  const { m, f, dateLocale, te } = useI18n();
  const t = m.join;
  const [company, setCompany] = useState<Company | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [walletState, setWalletState] = useState<"idle" | "loading" | "error">("idle");
  const [memberCard, setMemberCard] = useState<MemberCard | null>(null);
  const [birthdayDay, setBirthdayDay] = useState("");
  const [birthdayMonth, setBirthdayMonth] = useState("");
  const [birthdayError, setBirthdayError] = useState("");

  const loadMemberCard = useCallback(
    async (birthday?: string) => {
      const res = await fetch("/api/loyalty/member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, memberId: getMemberId(companyId), ...(birthday ? { birthday } : {}) }),
      });
      const data = await res.json();
      if (res.ok && data.enabled) {
        // La tarjeta de este navegador pudo unirse a la principal del cliente.
        if (data.memberId !== getMemberId(companyId)) setMemberId(companyId, data.memberId);
        setMemberCard(data);
      }
      return { ok: res.ok, error: data.error as string | undefined };
    },
    [companyId]
  );

  // Vuelve a leer el diseño y los puntos (el ícono de inicio en iPhone se reanuda sin recargar la página).
  const refreshCard = useCallback(() => {
    getDoc(doc(db, "companies", companyId))
      .then((snap) => {
        if (snap.exists()) setCompany(snap.data() as Company);
      })
      .catch(() => {});
    loadMemberCard().catch(() => {});
  }, [companyId, loadMemberCard]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") refreshCard();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pageshow", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pageshow", onVisible);
    };
  }, [refreshCard]);

  const saveBirthday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!birthdayDay || !birthdayMonth) {
      setBirthdayError(t.pickDate);
      return;
    }
    setBirthdayError("");
    const { ok, error } = await loadMemberCard(`${birthdayMonth.padStart(2, "0")}-${birthdayDay.padStart(2, "0")}`);
    if (!ok) setBirthdayError(error ?? t.saveFailed);
  };

  const addToGoogleWallet = async () => {
    setWalletState("loading");
    try {
      const res = await fetch("/api/wallet/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, memberId: getMemberId(companyId) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(te(data.error));
      setWalletState("idle");
      window.location.href = data.url;
    } catch (e) {
      console.error(e);
      setWalletState("error");
    }
  };

  const subscribe = useCallback(
    async (companyName: string) => {
      setStatus("subscribing");
      try {
        if (Notification.permission !== "granted") {
          const permission = await Notification.requestPermission();
          if (permission !== "granted") {
            setStatus(permission === "denied" ? "denied" : "ready");
            return;
          }
        }
        await navigator.serviceWorker.register("/firebase-messaging-sw.js");
        const registration = await navigator.serviceWorker.ready;
        const messaging = getMessaging(app);
        const token = await getToken(messaging, {
          vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
          serviceWorkerRegistration: registration,
        });
        // Firebase puede cambiar el token: borrar el anterior para no contar este celular dos veces.
        const previous = storedToken(companyId);
        if (previous && previous !== token) await deleteSubscriber(companyId, previous);
        storeToken(companyId, token);
        await setDoc(doc(db, "companies", companyId, "subscribers", token), {
          token,
          channel: "webpush",
          memberId: getMemberId(companyId),
          platform: isIOS() ? "ios" : /Android/i.test(navigator.userAgent) ? "android" : "web",
          createdAt: serverTimestamp(),
        });
        // Con la página abierta el SW no muestra la notificación; la mostramos aquí.
        onMessage(messaging, (payload) => {
          registration.showNotification(payload.notification?.title ?? companyName, {
            body: payload.notification?.body,
            icon: payload.notification?.icon,
          });
        });
        setStatus("subscribed");
      } catch (e) {
        console.error(e);
        setStatus("error");
      }
    },
    [companyId]
  );

  useEffect(() => {
    (async () => {
      const snap = await getDoc(doc(db, "companies", companyId));
      if (!snap.exists()) return setStatus("notfound");
      const data = snap.data() as Company;
      setCompany(data);
      // Puntos y cupones; la API responde enabled:false si el restaurante no usa ninguno.
      loadMemberCard().catch(console.error);
      if (isIOS() && !isStandalone()) return setStatus("ios-install");
      if (!(await isSupported())) return setStatus("unsupported");
      // Si ya no da permiso (bloqueó o lo quitó), deja de contar como suscrito.
      if (Notification.permission !== "granted" && storedToken(companyId)) {
        await deleteSubscriber(companyId, storedToken(companyId));
        storeToken(companyId, null);
      }
      if (Notification.permission === "denied") return setStatus("denied");
      // Ya dio permiso antes: refrescar token sin preguntar.
      if (Notification.permission === "granted") return subscribe(data.name);
      setStatus("ready");
    })().catch((e) => {
      console.error(e);
      setStatus("error");
    });
  }, [companyId, subscribe, loadMemberCard]);

  const brand = safeColor(company?.brandColor, DEFAULT_BRAND);
  const bg = safeColor(company?.bgColor, DEFAULT_BG);

  if (status === "loading") {
    return <Shell bg={bg}><p className="text-gray-500">{m.common.loading}</p></Shell>;
  }
  if (status === "notfound" || !company) {
    return <Shell bg={bg}><p className="text-gray-700">{t.invalid}</p></Shell>;
  }

  return (
    <Shell bg={bg}>
      {company.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={company.logoUrl} alt="" className="w-24 h-24 rounded-2xl object-cover mx-auto" />
      ) : null}
      <h1 className="text-2xl font-bold text-gray-900 text-balance">{company.name}</h1>
      {company.description ? <p className="text-gray-600">{company.description}</p> : null}

      <div className="mt-2 w-full">
        {(status === "ready" || status === "error") && (
          <>
            <p className="text-gray-700 mb-4">
              {t.lead}
            </p>
            <button
              onClick={() => subscribe(company.name)}
              className="w-full py-3 rounded-xl font-semibold hover:opacity-90"
              style={{ background: brand, color: textOn(brand) }}
            >
              {t.enable}
            </button>
            {status === "error" && (
              <p className="text-red-600 text-sm mt-3">
                {t.enableFailed}
              </p>
            )}
          </>
        )}

        {status === "subscribing" && <p className="text-gray-600">{t.enabling}</p>}

        {status === "subscribed" && (
          <div className="bg-green-50 text-green-800 rounded-xl p-4">
            <p className="font-semibold">{t.subscribedTitle}</p>
            <p className="text-sm">{t.subscribedText}</p>
          </div>
        )}

        {status === "ios-install" && (
          <div className="bg-gray-100 rounded-xl p-4 text-left text-gray-800">
            <p className="font-semibold mb-2">{t.iosTitle}</p>
            <ol className="list-decimal pl-5 space-y-1 text-sm">
              <li>{t.iosStep1}</li>
              <li>{t.iosStep2}</li>
              <li>{t.iosStep3}</li>
            </ol>
            <p className="text-xs text-gray-500 mt-2">{t.iosVersion}</p>
          </div>
        )}

        {status === "denied" && (
          <p className="text-gray-700">
            {t.blocked}
          </p>
        )}

        {status === "unsupported" && (
          <p className="text-gray-700">
            {t.unsupported}
          </p>
        )}
      </div>

      {memberCard && (
        <div className="w-full border-t pt-4 mt-2 flex flex-col items-center gap-2">
          <p className="font-semibold text-gray-900">{t.cardTitle}</p>
          {company.cardDesign && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/card-image/${companyId}?variant=card&s=${memberCard.stamps}&code=${memberCard.code}&v=${company.cardDesign.version ?? 0}`}
              alt={`${company.name} · ${memberCard.stamps} ${t.stamps}`}
              className="w-full aspect-[1012/638] rounded-2xl shadow-lg bg-gray-100"
            />
          )}
          <div className="bg-white p-2 rounded-xl border">
            <QRCodeSVG value={memberCard.memberId} size={160} />
          </div>
          <p className="font-mono text-sm text-gray-500">#{memberCard.code}</p>
          {memberCard.rewards.length > 0 && (
            <>
              <p className="text-3xl font-bold tabular-nums" style={{ color: brand }}>
                {memberCard.stamps.toLocaleString(dateLocale)} <span className="text-base font-normal text-gray-600">{t.points}</span>
              </p>
              <p className="text-sm text-gray-700">
                {nextRewardText(memberCard.rewards, memberCard.stamps, m.rewardText) || t.showCode}
              </p>
              <ul className="w-full text-sm text-left divide-y border rounded-lg">
                {memberCard.rewards.map((r) => (
                  <li key={r.id} className="flex justify-between gap-3 px-3 py-2">
                    <span className="text-gray-900">{r.title}</span>
                    <span className="text-gray-500 tabular-nums whitespace-nowrap">
                      {Math.min(memberCard.stamps, r.stamps)}/{r.stamps}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
          {memberCard.coupons.length > 0 && (
            <div className="w-full text-left">
              <p className="text-sm font-semibold text-gray-900 mb-1">{t.coupons}</p>
              <ul className="flex flex-col gap-2">
                {memberCard.coupons.map((c) => (
                  <li
                    key={c.id}
                    className={`border-2 border-dashed rounded-lg px-3 py-2 ${c.used ? "opacity-50" : ""}`}
                    style={{ borderColor: brand }}
                  >
                    <p className="font-semibold text-gray-900">{c.title}</p>
                    <p className="text-xs text-gray-500">
                      {c.used ? t.couponUsed : f(t.couponValid, { date: formatDay(c.expiresDate, dateLocale) })}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {memberCard.birthdayEnabled &&
            (memberCard.birthday ? (
              <p className="text-xs text-gray-500">{f(t.birthday, { date: formatBirthday(memberCard.birthday, dateLocale) })}</p>
            ) : (
              <form onSubmit={saveBirthday} className="w-full text-left border rounded-lg p-3 flex flex-col gap-2">
                <p className="text-sm font-semibold text-gray-900">{t.birthdayQuestion}</p>
                <p className="text-xs text-gray-600">{f(t.birthdayGift, { gift: memberCard.birthdayGift ?? "" })}</p>
                <div className="flex gap-2">
                  <select
                    id="birthday-day"
                    aria-label={t.day}
                    value={birthdayDay}
                    onChange={(e) => setBirthdayDay(e.target.value)}
                    className="border rounded p-2 text-sm"
                  >
                    <option value="">{t.day}</option>
                    {Array.from({ length: 31 }, (_, i) => (
                      <option key={i + 1} value={String(i + 1)}>
                        {i + 1}
                      </option>
                    ))}
                  </select>
                  <select
                    id="birthday-month"
                    aria-label={t.month}
                    value={birthdayMonth}
                    onChange={(e) => setBirthdayMonth(e.target.value)}
                    className="border rounded p-2 text-sm flex-1 min-w-0"
                  >
                    <option value="">{t.month}</option>
                    {monthNames(dateLocale).map((name, i) => (
                      <option key={name} value={String(i + 1)}>
                        {name}
                      </option>
                    ))}
                  </select>
                  <button
                    className="px-3 rounded text-sm font-semibold"
                    style={{ background: brand, color: textOn(brand) }}
                  >
                    {m.common.save}
                  </button>
                </div>
                {birthdayError && <p className="text-xs text-red-600">{birthdayError}</p>}
              </form>
            ))}
          <ProtectCard
            companyId={companyId}
            companyName={company.name}
            linked={memberCard.linked}
            email={memberCard.email}
            onLinked={refreshCard}
          />
          <button onClick={refreshCard} className="text-sm text-blue-700 py-2 px-3">
            {m.common.refresh}
          </button>
        </div>
      )}

      {/* Google Wallet no existe en iPhone; ahí irá Apple Wallet más adelante. */}
      {walletEnabled && !isIOS() && (
        <div className="w-full border-t pt-4 mt-2">
          <p className="text-sm text-gray-600 mb-3">{t.walletLead}</p>
          <button
            onClick={addToGoogleWallet}
            disabled={walletState === "loading"}
            className="w-full bg-black text-white py-3 rounded-full font-medium hover:bg-gray-800 disabled:opacity-60"
          >
            {walletState === "loading" ? t.walletOpening : t.walletAdd}
          </button>
          {walletState === "error" && (
            <p className="text-red-600 text-sm mt-2">{t.walletFailed}</p>
          )}
        </div>
      )}
    </Shell>
  );
}

function Shell({ bg, children }: { bg: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 py-10" style={{ background: bg }}>
      <div className="bg-white shadow-sm border rounded-2xl p-8 max-w-sm w-full text-center flex flex-col items-center gap-3">
        {children}
      </div>
      <LanguageSwitcher className="bg-white" />
    </main>
  );
}
