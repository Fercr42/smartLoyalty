"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { DEFAULT_BRAND, safeColor, textOn } from "../lib/colors";
import { formatDay } from "../lib/format";
import { cleanLoyalty, earnedFor, formatBalance, needsSale, type LoyaltyConfig } from "../lib/loyalty-mode";
import { nextRewardText, type Reward } from "../lib/rewards";
import { useI18n } from "../i18n/client";

type Company = { name: string; logoUrl?: string; brandColor?: string; rewards: Reward[]; loyalty?: unknown };
type Member = { memberId: string; code: string; stamps: number; totalVisits: number; name?: string };
type Notice = { ok: boolean; text: string } | null;
type Coupon = { id: string; title: string; expiresDate: string; used: boolean };

export default function StaffScanner({ companyId }: { companyId: string }) {
  const { m, f, dateLocale, locale, te } = useI18n();
  const t = m.scanner;
  const sessionKey = `staff-session:${companyId}`;
  const [token, setToken] = useState<string | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [pin, setPin] = useState("");
  const [member, setMember] = useState<Member | null>(null);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [scanning, setScanning] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [sale, setSale] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef(0);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(sessionKey) ?? "null");
      if (saved?.token) {
        // localStorage solo existe en el navegador: restaurar la sesión después de montar evita un error de hidratación.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setToken(saved.token);
        setCompany(saved.company);
      }
    } catch {}
  }, [sessionKey]);

  const logout = useCallback(() => {
    try {
      localStorage.removeItem(sessionKey);
    } catch {}
    setToken(null);
    setMember(null);
  }, [sessionKey]);

  const call = useCallback(
    async (payload: object) => {
      const res = await fetch("/api/loyalty/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { "X-Staff-Token": token } : {}) },
        body: JSON.stringify({ companyId, ...payload }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401 && token) logout();
      return { ok: res.ok, status: res.status, data };
    },
    [companyId, token, logout]
  );

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(frameRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  const lookup = useCallback(
    async (code: string) => {
      setBusy(true);
      setNotice(null);
      const { ok, data } = await call({ action: "scan", code });
      setBusy(false);
      if (!ok) {
        setNotice({ ok: false, text: te(data.error) ?? t.notFound });
        return;
      }
      setMember(data.member);
      setCoupons(data.coupons ?? []);
      setCompany((c) => (c ? { ...c, rewards: data.rewards, loyalty: data.loyalty ?? c.loyalty } : c));
    },
    [call, t, te]
  );

  const startCamera = async () => {
    setNotice(null);
    setMember(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      setScanning(true);
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
      const tick = () => {
        if (!streamRef.current) return;
        if (video.readyState === video.HAVE_ENOUGH_DATA && video.videoWidth) {
          const width = 480;
          const height = Math.round((video.videoHeight * width) / video.videoWidth);
          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(video, 0, 0, width, height);
          const found = jsQR(ctx.getImageData(0, 0, width, height).data, width, height);
          if (found?.data) {
            stopCamera();
            navigator.vibrate?.(80);
            lookup(found.data);
            return;
          }
        }
        frameRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch (e) {
      console.error(e);
      stopCamera();
      setNotice({ ok: false, text: t.cameraFailed });
    }
  };

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setNotice(null);
    const { ok, data } = await call({ action: "login", pin });
    setBusy(false);
    if (!ok) {
      setNotice({ ok: false, text: te(data.error) ?? t.loginFailed });
      return;
    }
    setToken(data.token);
    setCompany(data.company);
    setPin("");
    try {
      localStorage.setItem(sessionKey, JSON.stringify({ token: data.token, company: data.company }));
    } catch {}
  };

  const addStamp = async (force = false) => {
    if (!member) return;
    setBusy(true);
    setNotice(null);
    const { ok, status, data } = await call({ action: "stamp", memberId: member.memberId, force, sale: Number(sale) || 0 });
    setBusy(false);
    if (ok) setSale("");
    if (status === 409 && !force) {
      if (confirm(f(t.stampAgain, { error: te(data.error) ?? "" }))) addStamp(true);
      return;
    }
    if (!ok) {
      setNotice({ ok: false, text: te(data.error) ?? t.stampFailed });
      return;
    }
    setMember((m) => m && { ...m, stamps: data.stamps, totalVisits: m.totalVisits + 1 });
    setNotice({ ok: true, text: f(t.stampOk, { count: formatBalance(added, loyalty, locale), total: formatBalance(data.stamps, loyalty, locale) }) });
  };

  const cashout = async () => {
    if (!member || !confirm(f(t.confirmCashout, { amount: formatBalance(member.stamps, loyalty, locale) }))) return;
    setBusy(true);
    setNotice(null);
    const { ok, data } = await call({ action: "cashout", memberId: member.memberId });
    setBusy(false);
    if (!ok) {
      setNotice({ ok: false, text: te(data.error) ?? t.redeemFailed });
      return;
    }
    setMember((mem) => mem && { ...mem, stamps: 0 });
    setNotice({ ok: true, text: t.balanceUsed });
  };

  const redeem = async (reward: Reward) => {
    if (!member || !confirm(f(t.confirmRedeem, { reward: reward.title, count: reward.stamps }))) return;
    setBusy(true);
    setNotice(null);
    const { ok, data } = await call({ action: "redeem", memberId: member.memberId, rewardId: reward.id });
    setBusy(false);
    if (!ok) {
      setNotice({ ok: false, text: te(data.error) ?? t.redeemFailed });
      return;
    }
    setMember((m) => m && { ...m, stamps: data.stamps });
    setNotice({ ok: true, text: f(t.redeemOk, { reward: reward.title, count: formatBalance(data.stamps, loyalty, locale) }) });
  };

  const applyCoupon = async (coupon: Coupon) => {
    if (!member || !confirm(f(t.confirmCoupon, { coupon: coupon.title }))) return;
    setBusy(true);
    setNotice(null);
    const { ok, status, data } = await call({ action: "coupon", memberId: member.memberId, couponId: coupon.id });
    setBusy(false);
    if (ok || status === 409) {
      setCoupons((cs) => cs.map((c) => (c.id === coupon.id ? { ...c, used: true } : c)));
    }
    setNotice(ok ? { ok: true, text: f(t.couponApplied, { coupon: coupon.title }) } : { ok: false, text: te(data.error) ?? t.couponFailed });
  };

  const brand = safeColor(company?.brandColor, DEFAULT_BRAND);
  const rewards = company?.rewards ?? [];
  const loyalty: LoyaltyConfig = cleanLoyalty(company?.loyalty);
  const added = earnedFor(Number(sale), loyalty);
  const pideMonto = needsSale(loyalty.mode);
  const unidad = m.pass.unit[loyalty.mode];

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-6 flex justify-center">
      <div className="w-full max-w-md flex flex-col gap-4">
        <header className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {company?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={company.logoUrl} alt="" className="w-10 h-10 rounded-lg object-cover border" />
            ) : null}
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 truncate">{company?.name || t.title}</p>
              <p className="text-xs text-gray-500">{t.subtitle}</p>
            </div>
          </div>
          {token && (
            <button onClick={logout} className="text-sm text-gray-600 border rounded px-3 py-1.5">
              {t.exit}
            </button>
          )}
        </header>

        {!token ? (
          <form onSubmit={login} className="bg-white rounded-2xl border p-6 flex flex-col gap-3">
            <label htmlFor="staff-pin" className="font-semibold text-gray-900">
              {t.pin}
            </label>
            <input
              id="staff-pin"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={8}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              className="border rounded-lg p-3 text-2xl tracking-[0.5em] text-center"
              placeholder="••••"
            />
            <button
              disabled={busy || pin.length < 4}
              className="py-3 rounded-xl font-semibold disabled:opacity-50"
              style={{ background: brand, color: textOn(brand) }}
            >
              {busy ? t.entering : t.enter}
            </button>
            <p className="text-xs text-gray-500">{t.pinHint}</p>
          </form>
        ) : member ? (
          <section className="bg-white rounded-2xl border p-5 flex flex-col gap-4">
            {member.name && <p className="text-xl font-bold text-gray-900 -mb-2 break-words">{member.name}</p>}
            <div className="flex justify-between items-baseline">
              <span className="font-mono text-sm text-gray-500">#{member.code}</span>
              <span className="text-xs text-gray-500 tabular-nums">{f(t.visits, { count: member.totalVisits })}</span>
            </div>
            {rewards.length > 0 && (
            <>
            <div className="text-center">
              <p className="text-6xl font-bold tabular-nums" style={{ color: brand }}>
                {formatBalance(member.stamps, loyalty, locale)}
              </p>
              <p className="text-gray-600">{unidad}</p>
              <p className="text-sm text-gray-800 mt-1">{nextRewardText(rewards, member.stamps, m.rewardText)}</p>
            </div>
            {pideMonto && (
              <label htmlFor="staff-sale" className="flex flex-col gap-1 text-sm text-gray-700">
                {t.amount}
                <span className="flex items-center gap-2 border rounded-lg p-2">
                  <span className="text-gray-500">{loyalty.currency}</span>
                  <input
                    id="staff-sale"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={sale}
                    onChange={(e) => setSale(e.target.value)}
                    className="flex-1 min-w-0 text-xl tabular-nums outline-none"
                  />
                </span>
                <span className="text-xs text-gray-500 tabular-nums">
                  {f(t.willAdd, { points: `${formatBalance(added, loyalty, locale)} ${unidad.toLowerCase()}` })}
                </span>
              </label>
            )}
            <button
              onClick={() => addStamp()}
              disabled={busy || added <= 0}
              className="py-4 rounded-xl text-lg font-semibold disabled:opacity-50"
              style={{ background: brand, color: textOn(brand) }}
            >
              {loyalty.mode === "stamps" ? t.addStampButton : t.addPoints}
            </button>
            {loyalty.mode === "cashback" && member.stamps > 0 && (
              <button
                onClick={cashout}
                disabled={busy}
                className="py-3 rounded-xl font-semibold border-2 disabled:opacity-50"
                style={{ borderColor: brand, color: brand }}
              >
                {f(t.useBalance, { amount: formatBalance(member.stamps, loyalty, locale) })}
              </button>
            )}
            </>
            )}

            {rewards.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-2">{t.redeemTitle}</p>
                <ul className="flex flex-col gap-2">
                  {rewards.map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-3 border rounded-lg p-3">
                      <span className="min-w-0">
                        <b className="text-gray-900">{r.title}</b>
                        <span className="block text-xs text-gray-500">{formatBalance(r.stamps, loyalty, locale)} {unidad.toLowerCase()}</span>
                      </span>
                      <button
                        disabled={busy || member.stamps < r.stamps}
                        onClick={() => redeem(r)}
                        className="px-3 py-1.5 rounded-lg border text-sm font-medium disabled:opacity-40"
                      >
                        {t.redeem}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {coupons.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-2">{t.coupons}</p>
                <ul className="flex flex-col gap-2">
                  {coupons.map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-3 border-2 border-dashed rounded-lg p-3">
                      <span className="min-w-0">
                        <b className="text-gray-900">{c.title}</b>
                        <span className="block text-xs text-gray-500">{f(t.expires, { date: formatDay(c.expiresDate, dateLocale) })}</span>
                      </span>
                      <button
                        disabled={busy || c.used}
                        onClick={() => applyCoupon(c)}
                        className="px-3 py-1.5 rounded-lg border text-sm font-medium disabled:opacity-40"
                      >
                        {c.used ? t.used : t.use}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button onClick={startCamera} className="text-blue-700 py-2 font-medium">
              {t.scanAnother}
            </button>
          </section>
        ) : (
          <section className="bg-white rounded-2xl border p-5 flex flex-col gap-4">
            <div className={scanning ? "rounded-xl overflow-hidden bg-black" : "hidden"}>
              <video ref={videoRef} playsInline muted className="w-full aspect-square object-cover" />
            </div>
            {scanning ? (
              <button onClick={stopCamera} className="py-3 rounded-xl border font-medium">
                {m.common.cancel}
              </button>
            ) : (
              <button
                onClick={startCamera}
                disabled={busy}
                className="py-4 rounded-xl text-lg font-semibold disabled:opacity-50"
                style={{ background: brand, color: textOn(brand) }}
              >
                {busy ? t.searching : t.scan}
              </button>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (manualCode.trim()) lookup(manualCode);
              }}
              className="flex gap-2"
            >
              <input
                id="staff-manual-code"
                placeholder={t.codePlaceholder}
                value={manualCode}
                maxLength={8}
                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                className="border rounded-lg p-2 flex-1 min-w-0 font-mono"
              />
              <button disabled={busy} className="border rounded-lg px-4 font-medium disabled:opacity-50">
                {t.search}
              </button>
            </form>
          </section>
        )}

        {notice && (
          <p
            role="status"
            className={`rounded-xl p-3 text-sm ${notice.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}
          >
            {notice.text}
          </p>
        )}
      </div>
    </main>
  );
}
