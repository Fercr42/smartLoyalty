"use client";
import { useCallback, useEffect, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../contexts/AuthContext";
import type { CampaignDraft } from "../lib/ai-context";
import { formatDay } from "../lib/format";
import AiCampaignHelper from "./aiCampaignHelper";
import { compressImage } from "../lib/image";
import { useI18n } from "../i18n/client";
import { campaignAudience } from "../lib/notification-labels";

// Igual que MAX_IMAGE en lib/send-notification (~2 MB de foto).
const MAX_IMAGE_CHARS = 2_800_000;

const TYPES = ["promo", "horario", "evento", "aviso"] as const;
type TypeId = (typeof TYPES)[number];

const AUDIENCES = ["all", "frequent", "inactive", "near_reward"] as const;
type AudienceId = (typeof AUDIENCES)[number];
type Counts = Record<AudienceId, { devices: number; members: number }>;

const REPEATS = ["none", "daily", "weekly"] as const;
type RepeatId = (typeof REPEATS)[number];

type Sent = {
  id: string;
  title: string;
  body: string;
  sent: number;
  views?: number;
  hasImage?: boolean;
  couponId?: string;
  audience?: string;
  kind?: string;
  createdAt?: Timestamp;
};
type Scheduled = {
  id: string;
  sendAt: Timestamp;
  repeat: RepeatId;
  payload: { title: string; body: string; audience: AudienceId; couponId?: string; kind?: string; memberIds?: string[] };
};
type Coupon = { id: string; title: string; expiresDate: string; active: boolean; redemptions: number; expiresAt: Timestamp };
type Result = { ok: boolean; text: string; url?: string } | null;

const pad = (n: number) => String(n).padStart(2, "0");
const toLocalInput = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

export default function NotificationComposer() {
  const { user } = useAuth();
  const { m, f, dateLocale } = useI18n();
  const t = m.composer;
  const formatDateTime = (ms: number) => new Date(ms).toLocaleString(dateLocale, { dateStyle: "medium", timeStyle: "short" });
  const audienceLabel = (id?: string) => campaignAudience(m.labels, undefined, id ?? "members");
  const [type, setType] = useState<TypeId>("promo");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [imageData, setImageData] = useState<string | null>(null);
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [audience, setAudience] = useState<AudienceId>("all");
  const [withCoupon, setWithCoupon] = useState(false);
  const [couponTitle, setCouponTitle] = useState("");
  const [couponExpires, setCouponExpires] = useState(() => toLocalInput(new Date(Date.now() + 7 * 86_400_000)).slice(0, 10));
  const [when, setWhen] = useState<"now" | "later">("now");
  const [sendAt, setSendAt] = useState(() => toLocalInput(new Date(Date.now() + 3_600_000)));
  const [repeat, setRepeat] = useState<RepeatId>("none");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<Result>(null);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [history, setHistory] = useState<Sent[]>([]);
  const [scheduled, setScheduled] = useState<Scheduled[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);

  const current = t.types[type];

  const load = useCallback(async () => {
    if (!user) return;
    const [countsData, sentSnap, jobsSnap, couponsSnap] = await Promise.all([
      fetch("/api/notifications/audience", { headers: { Authorization: `Bearer ${await user.getIdToken()}` } })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      getDocs(query(collection(db, "companies", user.uid, "notifications"), orderBy("createdAt", "desc"), limit(10))),
      getDocs(query(collection(db, "scheduledJobs"), where("companyId", "==", user.uid))),
      getDocs(query(collection(db, "companies", user.uid, "coupons"), orderBy("createdAt", "desc"), limit(10))),
    ]);
    setCounts(countsData);
    setHistory(sentSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Sent, "id">) })));
    setScheduled(
      jobsSnap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<Scheduled, "id">) }))
        .sort((a, b) => a.sendAt.toMillis() - b.sendAt.toMillis())
    );
    setCoupons(couponsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Coupon, "id">) })));
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
      setResult({ ok: false, text: err instanceof Error ? err.message : t.invalidImage });
    }
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const later = when === "later";
    const sendAtMs = later ? new Date(sendAt).getTime() : undefined;
    if (later && (!sendAtMs || sendAtMs < Date.now())) {
      setResult({ ok: false, text: t.pastDate });
      return;
    }
    if (withCoupon && !couponTitle.trim()) {
      setResult({ ok: false, text: t.couponNameRequired });
      return;
    }

    const target = counts?.[audience];
    const who = audience === "all" ? t.everyone : audienceLabel(audience).toLowerCase();
    const question = later
      ? f(t.confirmSchedule, { date: formatDateTime(sendAtMs!), repeat: repeat !== "none" ? ` (${t.repeats[repeat].toLowerCase()})` : "", who })
      : f(t.confirmSend, { who, devices: target ? ` (${f(t.devicesCount, { count: target.devices })})` : "" });
    if (!confirm(question)) return;

    setSending(true);
    setResult(null);
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${await user.getIdToken()}` },
        body: JSON.stringify({
          type,
          title,
          body,
          audience,
          imageData: imageData ?? undefined,
          ctaLabel: ctaLabel.trim() || undefined,
          ctaUrl: ctaUrl.trim() || undefined,
          coupon: withCoupon
            ? {
                title: couponTitle.trim(),
                expiresDate: couponExpires,
                expiresAt: new Date(`${couponExpires}T23:59:59`).getTime(),
              }
            : undefined,
          sendAt: sendAtMs,
          repeat: later ? repeat : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t.sendError);
      setResult(
        data.scheduled
          ? { ok: true, text: f(t.scheduledFor, { date: formatDateTime(data.sendAt) }) }
          : {
              ok: true,
              text: `${f(t.sentTo, { count: data.sent })}${data.failed ? f(t.failedCount, { count: data.failed }) : ""}${
                data.wallet === "ok" ? t.walletSent : data.wallet === "error" ? t.walletFailed : ""
              }.`,
              url: data.promoUrl,
            }
      );
      setTitle("");
      setBody("");
      setImageData(null);
      setCtaLabel("");
      setCtaUrl("");
      setWithCoupon(false);
      setCouponTitle("");
      load().catch(console.error);
    } catch (err) {
      setResult({ ok: false, text: err instanceof Error ? err.message : t.sendError });
    } finally {
      setSending(false);
    }
  };

  const cancelScheduled = async (job: Scheduled) => {
    if (!confirm(f(t.confirmCancel, { title: job.payload.title }))) return;
    await deleteDoc(doc(db, "scheduledJobs", job.id));
    load().catch(console.error);
  };

  const deactivateCoupon = async (coupon: Coupon) => {
    if (!user || !confirm(f(t.confirmDeactivate, { title: coupon.title }))) return;
    await updateDoc(doc(db, "companies", user.uid, "coupons", coupon.id), { active: false });
    load().catch(console.error);
  };

  const applyDraft = (d: CampaignDraft) => {
    setType(d.type);
    setTitle(d.title);
    setBody(d.body);
    setAudience(d.audience);
    setWithCoupon(Boolean(d.coupon));
    setCouponTitle(d.coupon?.title ?? "");
    if (d.coupon) setCouponExpires(toLocalInput(new Date(Date.now() + d.coupon.days * 86_400_000)).slice(0, 10));
    if (d.sendAt && new Date(d.sendAt).getTime() > Date.now()) {
      setWhen("later");
      setSendAt(d.sendAt);
      setRepeat("none");
    } else {
      setWhen("now");
    }
    setResult(null);
    document.getElementById("notif-title")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const nobody = when === "now" && counts && counts[audience].devices === 0 && counts[audience].members === 0;

  return (
    <div className="flex flex-col gap-6">
    <AiCampaignHelper onUse={applyDraft} />
    <div className="grid gap-8 lg:grid-cols-2">
      <form onSubmit={send} className="flex flex-col gap-4">
        <p className="text-sm text-gray-600">
          {t.subscribed} <b className="text-gray-900 tabular-nums">{counts?.all.devices ?? "—"}</b>
          {" · "}{t.withCard} <b className="text-gray-900 tabular-nums">{counts?.all.members ?? "—"}</b>
        </p>

        <div className="flex flex-wrap gap-2">
          {TYPES.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setType(id)}
              className={`px-3 py-1.5 rounded-full text-sm border ${
                type === id ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-700 hover:bg-gray-100"
              }`}
            >
              {t.types[id].label}
            </button>
          ))}
        </div>

        <input
          id="notif-title"
          placeholder={f(t.titlePlaceholder, { example: current.title })}
          value={title}
          maxLength={65}
          onChange={(e) => setTitle(e.target.value)}
          className="border p-2 rounded"
          required
        />
        <textarea
          id="notif-body"
          placeholder={f(t.bodyPlaceholder, { example: current.body })}
          value={body}
          maxLength={240}
          rows={3}
          onChange={(e) => setBody(e.target.value)}
          className="border p-2 rounded"
          required
        />

        <div className="flex flex-wrap items-center gap-3">
          <label className="border px-3 py-1.5 rounded text-sm cursor-pointer hover:bg-gray-100">
            {imageData ? t.changePhoto : t.addPhoto}
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
              {t.removePhoto}
            </button>
          )}
        </div>

        <fieldset className="border rounded p-3 flex flex-col gap-2">
          <legend className="text-sm text-gray-600 px-1">{t.who}</legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {AUDIENCES.map((id) => (
              <label
                key={id}
                htmlFor={`audience-${id}`}
                className={`border rounded-lg p-2 cursor-pointer text-sm ${
                  audience === id ? "border-gray-900 bg-gray-50" : "hover:bg-gray-50"
                }`}
              >
                <span className="flex items-center gap-2">
                  <input
                    id={`audience-${id}`}
                    type="radio"
                    name="audience"
                    checked={audience === id}
                    onChange={() => setAudience(id)}
                  />
                  <b className="text-gray-900">{m.labels.audiences[id]}</b>
                </span>
                <span className="block text-xs text-gray-500 pl-5">
                  {t.audienceHints[id]} · {counts ? f(t.devicesCount, { count: counts[id].devices }) : "…"}
                </span>
              </label>
            ))}
          </div>
          {audience !== "all" && (
            <p className="text-xs text-gray-500">
              {t.groupsNote}
            </p>
          )}
        </fieldset>

        <fieldset className="border rounded p-3 flex flex-col gap-2">
          <legend className="text-sm text-gray-600 px-1">{t.couponLegend}</legend>
          <label htmlFor="notif-with-coupon" className="flex items-center gap-2 text-sm text-gray-800">
            <input
              id="notif-with-coupon"
              type="checkbox"
              checked={withCoupon}
              onChange={(e) => setWithCoupon(e.target.checked)}
            />
            {t.includeCoupon}
          </label>
          {withCoupon && (
            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
              <input
                id="notif-coupon-title"
                placeholder={t.couponPlaceholder}
                value={couponTitle}
                maxLength={60}
                onChange={(e) => setCouponTitle(e.target.value)}
                className="border p-2 rounded min-w-0"
              />
              <label htmlFor="notif-coupon-expires" className="flex items-center gap-2 text-sm text-gray-600">
                {t.expires}
                <input
                  id="notif-coupon-expires"
                  type="date"
                  value={couponExpires}
                  onChange={(e) => setCouponExpires(e.target.value)}
                  className="border p-2 rounded"
                />
              </label>
              <p className="col-span-2 text-xs text-gray-500">
                {t.couponNote}
              </p>
            </div>
          )}
        </fieldset>

        <fieldset className="border rounded p-3 flex flex-col gap-2">
          <legend className="text-sm text-gray-600 px-1">{t.ctaLegend}</legend>
          <input
            id="notif-cta-label"
            placeholder={t.ctaLabelPlaceholder}
            value={ctaLabel}
            maxLength={30}
            onChange={(e) => setCtaLabel(e.target.value)}
            className="border p-2 rounded"
          />
          <input
            id="notif-cta-url"
            type="url"
            placeholder={t.ctaUrlPlaceholder}
            value={ctaUrl}
            onChange={(e) => setCtaUrl(e.target.value)}
            className="border p-2 rounded"
          />
        </fieldset>

        <fieldset className="border rounded p-3 flex flex-col gap-2">
          <legend className="text-sm text-gray-600 px-1">{t.when}</legend>
          <div className="flex flex-wrap gap-4 text-sm">
            <label htmlFor="when-now" className="flex items-center gap-2">
              <input id="when-now" type="radio" name="when" checked={when === "now"} onChange={() => setWhen("now")} />
              {t.sendNow}
            </label>
            <label htmlFor="when-later" className="flex items-center gap-2">
              <input id="when-later" type="radio" name="when" checked={when === "later"} onChange={() => setWhen("later")} />
              {t.schedule}
            </label>
          </div>
          {when === "later" && (
            <div className="flex flex-wrap gap-2">
              <input
                id="notif-send-at"
                type="datetime-local"
                value={sendAt}
                onChange={(e) => setSendAt(e.target.value)}
                className="border p-2 rounded"
              />
              <select
                id="notif-repeat"
                value={repeat}
                onChange={(e) => setRepeat(e.target.value as RepeatId)}
                className="border p-2 rounded"
              >
                {REPEATS.map((id) => (
                  <option key={id} value={id}>
                    {t.repeats[id]}
                  </option>
                ))}
              </select>
              <p className="w-full text-xs text-gray-500">{t.delayNote}</p>
            </div>
          )}
        </fieldset>

        <button disabled={sending || Boolean(nobody)} className="bg-blue-600 text-white p-2 rounded disabled:opacity-50">
          {sending
            ? when === "later"
              ? t.scheduling
              : t.sending
            : nobody
              ? t.nobody
              : when === "later"
                ? t.scheduleButton
                : t.sendButton}
        </button>
        {result && (
          <p className={`text-sm ${result.ok ? "text-green-700" : "text-red-600"}`}>
            {result.text}{" "}
            {result.url && (
              <a href={result.url} target="_blank" className="underline">
                {t.viewPromo}
              </a>
            )}
          </p>
        )}
      </form>

      <div className="flex flex-col gap-6">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">{t.preview}</p>
          <div className="rounded-xl bg-gray-100 p-3 text-left shadow-inner">
            <p className="font-semibold text-gray-900">{title || current.title}</p>
            <p className="text-sm text-gray-700">{body || current.body}</p>
            {imageData && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageData} alt="" className="mt-2 rounded-lg w-full max-h-48 object-cover" />
            )}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {t.iphoneNote}
          </p>
        </div>

        {scheduled.length > 0 && (
          <div>
            <h3 className="font-semibold mb-2">{t.scheduled}</h3>
            <ul className="divide-y text-sm">
              {scheduled.map((job) => (
                <li key={job.id} className="py-2 flex justify-between gap-3">
                  <span className="min-w-0">
                    <span className="font-medium text-gray-900">{job.payload.title}</span>
                    <span className="block text-xs text-gray-500">
                      {formatDateTime(job.sendAt.toMillis())} · {t.repeats[job.repeat] ?? t.repeats.none} ·{" "}
                      {job.payload.memberIds
                        ? `${(job.payload.kind && (m.labels.automatic as Record<string, string>)[job.payload.kind]) || t.automaticSend} · ${
                            job.payload.memberIds.length === 1 ? t.oneCustomer : f(t.manyCustomers, { count: job.payload.memberIds.length })
                          }`
                        : audienceLabel(job.payload.audience)}
                      {job.payload.couponId ? t.withCoupon : ""}
                    </span>
                  </span>
                  <button onClick={() => cancelScheduled(job)} className="text-xs text-red-600 whitespace-nowrap">
                    {m.common.cancel}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {coupons.length > 0 && (
          <div>
            <h3 className="font-semibold mb-2">{t.coupons}</h3>
            <ul className="divide-y text-sm">
              {coupons.map((c) => {
                const live = c.active && c.expiresAt.toMillis() > Date.now();
                return (
                  <li key={c.id} className="py-2 flex justify-between gap-3">
                    <span className="min-w-0">
                      <span className="font-medium text-gray-900">{c.title}</span>
                      <span className="block text-xs text-gray-500">
                        {f(t.usedCount, { count: c.redemptions })} · {live ? f(t.expiresOn, { date: formatDay(c.expiresDate, dateLocale) }) : t.inactive}
                      </span>
                    </span>
                    {live && (
                      <button onClick={() => deactivateCoupon(c)} className="text-xs text-red-600 whitespace-nowrap">
                        {t.deactivate}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {history.length > 0 && user && (
          <div>
            <h3 className="font-semibold mb-2">{t.sent}</h3>
            <ul className="divide-y">
              {history.map((n) => (
                <li key={n.id} className="py-2 text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="font-medium text-gray-900">{n.title}</span>
                    <span className="text-gray-500 tabular-nums whitespace-nowrap">
                      {n.createdAt?.toDate().toLocaleDateString(dateLocale)}
                    </span>
                  </div>
                  <p className="text-gray-600">{n.body}</p>
                  <p className="text-xs text-gray-500 tabular-nums">
                    {f(t.sentStats, { sent: n.sent, views: n.views ?? 0 })} ·{" "}
                    {campaignAudience(m.labels, n.kind, n.audience ?? "all")}
                    {n.couponId ? t.withCoupon : ""}
                    {" · "}
                    <a href={`/promo/${user.uid}/${n.id}`} target="_blank" className="text-blue-600">
                      {t.viewPage}
                    </a>
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
    </div>
  );
}
