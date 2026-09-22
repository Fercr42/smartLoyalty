"use client";
import { useCallback, useEffect, useState } from "react";
import { collection, doc, getDoc, getDocs, limit, orderBy, query, setDoc, Timestamp } from "firebase/firestore";
import { QRCodeSVG } from "qrcode.react";
import { db } from "../firebase/config";
import { useAuth } from "../contexts/AuthContext";
import { useI18n } from "../i18n/client";
import { cleanBusinessType, type BusinessType } from "../lib/business-types";
import { cleanLoyalty, DEFAULT_RULE, pointsFor } from "../lib/loyalty-mode";
import { publicOrigin } from "../lib/origin";
import { cleanRewards, MAX_REWARDS } from "../lib/rewards";
import { syncWalletCards } from "../lib/walletClient";
import AiFeedbackSummary from "./aiFeedbackSummary";

type Row = { id: string; title: string; stamps: string };
type Event = {
  id: string;
  type: "stamp" | "redeem" | "coupon";
  code: string;
  rewardTitle?: string;
  couponTitle?: string;
  stampsAfter?: number;
  amount?: number;
  at?: Timestamp;
};
type Notice = { ok: boolean; text: string } | null;
type Feedback = { id: string; rating: number; comment: string; code: string | null; at?: Timestamp };

const HINT_POINTS = ["400", "800", "2000"];
const newRow = (): Row => ({ id: crypto.randomUUID().slice(0, 8), title: "", stamps: "" });

export default function LoyaltyEditor() {
  const { user } = useAuth();
  const { m, f: tf, dateLocale, te } = useI18n();
  const t = m.rewards;
  const [businessType, setBusinessType] = useState<BusinessType>("other");
  const [rulePoints, setRulePoints] = useState(String(DEFAULT_RULE.points));
  const [rulePer, setRulePer] = useState(String(DEFAULT_RULE.per));
  const [currency, setCurrency] = useState("$");
  const [rows, setRows] = useState<Row[]>([newRow(), newRow()]);
  const [pinSet, setPinSet] = useState(false);
  const [pin, setPin] = useState("");
  const [events, setEvents] = useState<Event[]>([]);
  const [savingRewards, setSavingRewards] = useState(false);
  const [savingPin, setSavingPin] = useState(false);
  const [rewardsNotice, setRewardsNotice] = useState<Notice>(null);
  const [pinNotice, setPinNotice] = useState<Notice>(null);
  const [scanUrl, setScanUrl] = useState("");
  const [reviewEnabled, setReviewEnabled] = useState(false);
  const [reviewUrl, setReviewUrl] = useState("");
  const [reviewDelay, setReviewDelay] = useState("2");
  const [reviewClicks, setReviewClicks] = useState(0);
  const [reviewSurvey, setReviewSurvey] = useState(true);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [feedbackStats, setFeedbackStats] = useState({ count: 0, sum: 0 });
  const [savingReview, setSavingReview] = useState(false);
  const [reviewNotice, setReviewNotice] = useState<Notice>(null);

  const loadEvents = useCallback(async () => {
    if (!user) return;
    const snap = await getDocs(
      query(collection(db, "companies", user.uid, "loyaltyEvents"), orderBy("at", "desc"), limit(15))
    );
    setEvents(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Event, "id">) })));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setScanUrl(`${publicOrigin(window.location.origin)}/scan/${user.uid}`);
    getDoc(doc(db, "companies", user.uid))
      .then((snap) => {
        setBusinessType(cleanBusinessType(snap.data()?.businessType));
        const loyalty = snap.data()?.loyalty ?? {};
        const config = cleanLoyalty(loyalty);
        setRulePoints(String(config.rule.points));
        setRulePer(String(config.rule.per));
        setCurrency(config.currency);
        const saved = cleanRewards(loyalty.rewards);
        if (saved.length) setRows(saved.map((r) => ({ id: r.id, title: r.title, stamps: String(r.stamps) })));
        setPinSet(Boolean(loyalty.pinSet));
        const reviews = snap.data()?.reviews ?? {};
        setReviewEnabled(Boolean(reviews.enabled));
        setReviewUrl(reviews.url ?? "");
        setReviewDelay(String(reviews.delayHours ?? 2));
        setReviewClicks(reviews.clicks ?? 0);
        setReviewSurvey(reviews.survey !== false);
        const stats = snap.data()?.feedbackStats;
        if (stats) setFeedbackStats({ count: stats.count ?? 0, sum: stats.sum ?? 0 });
      })
      .catch(console.error);
    loadEvents().catch(console.error);
    getDocs(query(collection(db, "companies", user.uid, "feedback"), orderBy("at", "desc"), limit(10)))
      .then((snap) => setFeedback(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Feedback, "id">) }))))
      .catch(console.error);
  }, [user, loadEvents]);

  const updateRow = (id: string, key: "title" | "stamps", value: string) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, [key]: value } : r)));

  const saveRewards = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const partial = rows.find((r) => (r.title.trim() && !r.stamps) || (!r.title.trim() && r.stamps));
    if (partial) {
      setRewardsNotice({ ok: false, text: t.incomplete });
      return;
    }
    const rewards = cleanRewards(rows.map((r) => ({ id: r.id, title: r.title, stamps: Number(r.stamps) })));
    setSavingRewards(true);
    setRewardsNotice(null);
    try {
      await setDoc(
        doc(db, "companies", user.uid),
        {
          loyalty: {
            rewards,
            rule: { points: Number(rulePoints) || DEFAULT_RULE.points, per: Number(rulePer) || DEFAULT_RULE.per },
            currency: currency.trim() || "$",
          },
        },
        { merge: true }
      );
      const updated = await syncWalletCards(user);
      setRewardsNotice({
        ok: true,
        text: rewards.length
          ? updated
            ? tf(t.savedWallet, { count: updated })
            : m.common.saved
          : t.savedOff,
      });
    } catch (err) {
      console.error(err);
      setRewardsNotice({ ok: false, text: m.common.networkError });
    } finally {
      setSavingRewards(false);
    }
  };

  const saveReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (reviewUrl.trim() && !/^https:\/\/\S+$/.test(reviewUrl.trim())) {
      setReviewNotice({ ok: false, text: t.reviewUrlInvalid });
      return;
    }
    if (reviewEnabled && !reviewSurvey && !reviewUrl.trim()) {
      setReviewNotice({ ok: false, text: t.reviewUrlRequired });
      return;
    }
    setSavingReview(true);
    setReviewNotice(null);
    try {
      await setDoc(
        doc(db, "companies", user.uid),
        { reviews: { enabled: reviewEnabled, url: reviewUrl.trim(), delayHours: Number(reviewDelay), survey: reviewSurvey } },
        { merge: true }
      );
      setReviewNotice({
        ok: true,
        text: reviewEnabled ? t.reviewOn : t.reviewOff,
      });
    } catch (err) {
      console.error(err);
      setReviewNotice({ ok: false, text: m.common.networkError });
    } finally {
      setSavingReview(false);
    }
  };

  const savePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingPin(true);
    setPinNotice(null);
    try {
      const res = await fetch("/api/loyalty/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${await user.getIdToken()}` },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(te(data.error) ?? t.pinFailed);
      setPinSet(true);
      setPin("");
      setPinNotice({ ok: true, text: t.pinSaved });
    } catch (err) {
      setPinNotice({ ok: false, text: err instanceof Error ? err.message : t.pinFailed });
    } finally {
      setSavingPin(false);
    }
  };

  const exampleSale = (Number(rulePer) || DEFAULT_RULE.per) * 2.4;
  const examplePoints = pointsFor(exampleSale, {
    points: Number(rulePoints) || DEFAULT_RULE.points,
    per: Number(rulePer) || DEFAULT_RULE.per,
  });

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="flex flex-col gap-6">
        <form onSubmit={saveRewards} className="flex flex-col gap-3">
          <div>
            <h3 className="font-semibold text-gray-900">{t.title}</h3>
            <p className="text-sm text-gray-600">{t.leadPoints}</p>
          </div>

          <fieldset className="border rounded-lg p-3 flex flex-col gap-2">
            <legend className="text-sm text-gray-600 px-1">{t.modeTitle}</legend>
              <>
                <div className="grid grid-cols-3 gap-2">
                  <label htmlFor="rule-points" className="flex flex-col gap-1 text-xs text-gray-600">
                    {t.rulePoints}
                    <input
                      id="rule-points"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      value={rulePoints}
                      onChange={(e) => setRulePoints(e.target.value)}
                      className="border p-2 rounded text-sm tabular-nums min-w-0"
                    />
                  </label>
                  <label htmlFor="rule-per" className="flex flex-col gap-1 text-xs text-gray-600">
                    {t.rulePer}
                    <input
                      id="rule-per"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      value={rulePer}
                      onChange={(e) => setRulePer(e.target.value)}
                      className="border p-2 rounded text-sm tabular-nums min-w-0"
                    />
                  </label>
                  <label htmlFor="rule-currency" className="flex flex-col gap-1 text-xs text-gray-600">
                    {t.currency}
                    <input
                      id="rule-currency"
                      maxLength={5}
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="border p-2 rounded text-sm min-w-0"
                    />
                  </label>
                </div>
                <p className="text-xs text-gray-500 tabular-nums">
                  {tf(t.ruleExample, { sale: `${currency}${exampleSale.toLocaleString(dateLocale)}`, points: examplePoints.toLocaleString(dateLocale) })}
                </p>
              </>
          </fieldset>
          {rows.map((row, i) => (
            <div key={row.id} className="grid grid-cols-[minmax(0,1fr)_7rem_auto] gap-2 items-center">
              <input
                id={`reward-title-${row.id}`}
                placeholder={m.niches.rewardHints[businessType][i] ?? t.rewardName}
                value={row.title}
                maxLength={40}
                onChange={(e) => updateRow(row.id, "title", e.target.value)}
                className="border p-2 rounded min-w-0"
              />
              <input
                id={`reward-stamps-${row.id}`}
                type="number"
                inputMode="numeric"
                min={1}
                max={1_000_000}
                placeholder={HINT_POINTS[i] ?? "1000"}
                value={row.stamps}
                onChange={(e) => updateRow(row.id, "stamps", e.target.value)}
                className="border p-2 rounded tabular-nums"
                aria-label={t.pointsNeeded}
              />
              <button
                type="button"
                onClick={() => setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.id !== row.id) : [newRow()]))}
                className="text-sm text-red-600 px-2 py-2"
                aria-label={t.removeReward}
              >
                {m.common.remove}
              </button>
            </div>
          ))}
          {rows.length < MAX_REWARDS && (
            <button
              type="button"
              onClick={() => setRows((rs) => [...rs, newRow()])}
              className="self-start text-sm text-blue-700 py-2"
            >
              {t.addReward}
            </button>
          )}
          <button disabled={savingRewards} className="bg-green-600 text-white p-2 rounded disabled:opacity-50">
            {savingRewards ? m.common.saving : t.saveRewards}
          </button>
          {rewardsNotice && (
            <p className={`text-sm ${rewardsNotice.ok ? "text-green-700" : "text-red-600"}`}>{rewardsNotice.text}</p>
          )}
        </form>

        <form onSubmit={savePin} className="flex flex-col gap-3 border-t pt-6">
          <div>
            <h3 className="font-semibold text-gray-900">{t.pinTitle}</h3>
            <p className="text-sm text-gray-600">
              {pinSet ? t.pinActive : t.pinHint}
            </p>
          </div>
          <div className="flex gap-2">
            <input
              id="staff-pin-new"
              type="password"
              inputMode="numeric"
              autoComplete="new-password"
              placeholder={t.pinPlaceholder}
              maxLength={8}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              className="border p-2 rounded flex-1 min-w-0"
            />
            <button
              disabled={savingPin || pin.length < 4}
              className="bg-gray-900 text-white px-4 rounded whitespace-nowrap disabled:opacity-50"
            >
              {savingPin ? m.common.saving : pinSet ? t.changePin : t.savePin}
            </button>
          </div>
          {pinNotice && (
            <p className={`text-sm ${pinNotice.ok ? "text-green-700" : "text-red-600"}`}>{pinNotice.text}</p>
          )}
        </form>

        <form onSubmit={saveReview} className="flex flex-col gap-3 border-t pt-6">
          <div>
            <h3 className="font-semibold text-gray-900">{t.reviewTitle}</h3>
            <p className="text-sm text-gray-600">
              {t.reviewLead}
            </p>
          </div>
          <label htmlFor="review-enabled" className="flex items-center gap-2 text-sm text-gray-800">
            <input
              id="review-enabled"
              type="checkbox"
              checked={reviewEnabled}
              onChange={(e) => setReviewEnabled(e.target.checked)}
            />
            {t.reviewAuto}
          </label>
          <label htmlFor="review-survey" className="flex items-center gap-2 text-sm text-gray-800">
            <input
              id="review-survey"
              type="checkbox"
              checked={reviewSurvey}
              onChange={(e) => setReviewSurvey(e.target.checked)}
            />
            {t.reviewSurvey}
          </label>
          <input
            id="review-url"
            type="url"
            placeholder={t.reviewUrlPlaceholder}
            value={reviewUrl}
            onChange={(e) => setReviewUrl(e.target.value)}
            className="border p-2 rounded"
          />
          <p className="text-xs text-gray-500">{t.reviewUrlHint}</p>
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="review-delay" className="text-sm text-gray-700">
              {t.send}
            </label>
            <select
              id="review-delay"
              value={reviewDelay}
              onChange={(e) => setReviewDelay(e.target.value)}
              className="border p-2 rounded text-sm"
            >
              <option value="1">{t.delay1}</option>
              <option value="2">{t.delay2}</option>
              <option value="4">{t.delay4}</option>
              <option value="24">{t.delay24}</option>
            </select>
            <button disabled={savingReview} className="bg-gray-900 text-white px-4 py-2 rounded disabled:opacity-50">
              {savingReview ? m.common.saving : m.common.save}
            </button>
          </div>
          <p className="text-xs text-gray-500 tabular-nums">{tf(t.reviewClicks, { count: reviewClicks })}</p>

          <div className="border-t pt-4 flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-3">
              <h4 className="font-semibold text-gray-900">{t.feedbackTitle}</h4>
              <span className="text-sm text-gray-600 tabular-nums">
                {feedbackStats.count
                  ? tf(t.feedbackStats, { avg: (feedbackStats.sum / feedbackStats.count).toFixed(1), count: feedbackStats.count })
                  : t.noFeedback}
              </span>
            </div>
            {feedbackStats.count > 0 && <AiFeedbackSummary />}
            {feedback.length > 0 && (
              <ul className="divide-y text-sm">
                {feedback.map((f) => (
                  <li key={f.id} className="py-2">
                    <div className="flex justify-between gap-3">
                      <span className={f.rating <= 3 ? "text-red-700 font-medium" : "text-gray-900 font-medium"}>
                        {"★".repeat(f.rating)}
                        <span className="text-gray-300">{"★".repeat(5 - f.rating)}</span>
                      </span>
                      <span className="text-xs text-gray-500 whitespace-nowrap tabular-nums">
                        {f.code ? `#${f.code} · ` : ""}
                        {f.at?.toDate().toLocaleDateString(dateLocale, { day: "numeric", month: "short" })}
                      </span>
                    </div>
                    {f.comment && <p className="text-gray-700">{f.comment}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>
          {reviewNotice && (
            <p className={`text-sm ${reviewNotice.ok ? "text-green-700" : "text-red-600"}`}>{reviewNotice.text}</p>
          )}
        </form>
      </div>

      <div className="flex flex-col gap-6">
        {scanUrl && (
          <div className="flex gap-4 items-center border rounded-lg p-4">
            <div className="bg-white p-1.5 border rounded">
              <QRCodeSVG value={scanUrl} size={96} />
            </div>
            <div className="min-w-0 flex flex-col gap-1">
              <p className="font-semibold text-gray-900">{t.scannerTitle}</p>
              <p className="text-sm text-gray-600">{t.scannerHint}</p>
              <a href={scanUrl} target="_blank" className="text-sm text-blue-700 break-all">
                {t.openScanner}
              </a>
            </div>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-900">{t.activity}</h3>
            <button type="button" onClick={() => loadEvents().catch(console.error)} className="text-sm text-blue-700">
              {m.common.refresh}
            </button>
          </div>
          {events.length === 0 ? (
            <p className="text-sm text-gray-500">{t.noActivity}</p>
          ) : (
            <ul className="divide-y text-sm">
              {events.map((ev) => (
                <li key={ev.id} className="py-2 flex justify-between gap-3">
                  <span className="min-w-0">
                    <b className="text-gray-900">
                      {ev.type === "stamp"
                        ? tf(t.stamp, { count: ev.amount ?? 0 })
                        : ev.type === "redeem"
                          ? tf(t.redeemed, { reward: ev.rewardTitle ?? "" })
                          : tf(t.usedCoupon, { coupon: ev.couponTitle ?? "" })}
                    </b>{" "}
                    <span className="font-mono text-gray-500">#{ev.code}</span>
                    {ev.type !== "coupon" && (
                      <span className="block text-xs text-gray-500">{tf(t.stampsLeft, { count: ev.stampsAfter ?? 0 })}</span>
                    )}
                  </span>
                  <span className="text-gray-500 text-xs whitespace-nowrap tabular-nums">
                    {ev.at?.toDate().toLocaleString(dateLocale, { dateStyle: "short", timeStyle: "short" })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
