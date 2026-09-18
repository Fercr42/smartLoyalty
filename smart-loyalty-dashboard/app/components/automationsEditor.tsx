"use client";
import { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../contexts/AuthContext";
import { useI18n } from "../i18n/client";
import {
  automationDefaults,
  AUTOMATIONS_RUN_HOUR,
  cleanAutomations,
  fillTemplate,
  NEAR_REWARD_DELAY_MIN,
  type Automations,
} from "../lib/automations-config";
import { cleanRewards } from "../lib/rewards";

type Notice = { ok: boolean; text: string } | null;

export default function AutomationsEditor() {
  const { user } = useAuth();
  const { m, f } = useI18n();
  const t = m.automations;
  const [settings, setSettings] = useState<Automations>(() => automationDefaults(t.defaults));
  const [companyName, setCompanyName] = useState("");
  const [firstReward, setFirstReward] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, "companies", user.uid))
      .then((snap) => {
        const data = snap.data() ?? {};
        setSettings(cleanAutomations(data.automations, t.defaults));
        setCompanyName(data.name ?? "");
        setFirstReward(cleanRewards(data.loyalty?.rewards)[0]?.title ?? "");
      })
      .catch(console.error);
  }, [user, t]);

  const update = <K extends keyof Automations>(key: K, patch: Partial<Automations[K]>) =>
    setSettings((s) => ({ ...s, [key]: { ...s[key], ...patch } }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setNotice(null);
    try {
      const clean = cleanAutomations(settings, t.defaults);
      await setDoc(
        doc(db, "companies", user.uid),
        {
          automations: clean,
          automationsEnabled: clean.birthday.enabled || clean.winback.enabled,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        { merge: true }
      );
      setSettings(clean);
      setNotice({ ok: true, text: t.saved });
    } catch (err) {
      console.error(err);
      setNotice({ ok: false, text: m.common.networkError });
    } finally {
      setSaving(false);
    }
  };

  const vars = { business: companyName || t.fallbackBusiness, reward: firstReward || t.fallbackReward };
  const { nearReward, birthday, winback } = settings;

  return (
    <form onSubmit={save} className="flex flex-col gap-6">
      <p className="text-sm text-gray-600">{f(t.intro, { hour: AUTOMATIONS_RUN_HOUR, vars: t.varsList })}</p>

      <div className="grid gap-4 lg:grid-cols-3">
        <AutomationCard
          id="near-reward"
          title={t.nearRewardTitle}
          description={f(t.nearRewardDescription, { minutes: NEAR_REWARD_DELAY_MIN })}
          enabled={nearReward.enabled}
          onToggle={(enabled) => update("nearReward", { enabled })}
          preview={{
            title: fillTemplate(nearReward.title, vars),
            body: fillTemplate(nearReward.message, vars),
          }}
        >
          {!firstReward && (
            <p className="text-xs text-amber-700">{t.addRewardsFirst}</p>
          )}
          <TextField id="near-reward-title" label={t.title} value={nearReward.title} max={65} onChange={(title) => update("nearReward", { title })} />
          <TextArea id="near-reward-message" label={t.message} value={nearReward.message} onChange={(message) => update("nearReward", { message })} />
        </AutomationCard>

        <AutomationCard
          id="birthday"
          title={t.birthdayTitle}
          description={t.birthdayDescription}
          enabled={birthday.enabled}
          onToggle={(enabled) => update("birthday", { enabled })}
          preview={{
            title: fillTemplate(birthday.title, { ...vars, gift: birthday.gift, days: birthday.days }),
            body: fillTemplate(birthday.message, { ...vars, gift: birthday.gift, days: birthday.days }),
            coupon: birthday.gift,
          }}
        >
          <div className="grid grid-cols-[minmax(0,1fr)_6rem] gap-2">
            <TextField id="birthday-gift" label={t.gift} value={birthday.gift} max={60} onChange={(gift) => update("birthday", { gift })} />
            <NumberField id="birthday-days" label={t.validDays} value={birthday.days} min={1} max={60} onChange={(days) => update("birthday", { days })} />
          </div>
          <TextField id="birthday-title" label={t.title} value={birthday.title} max={65} onChange={(title) => update("birthday", { title })} />
          <TextArea id="birthday-message" label={t.message} value={birthday.message} onChange={(message) => update("birthday", { message })} />
        </AutomationCard>

        <AutomationCard
          id="winback"
          title={t.winbackTitle}
          description={t.winbackDescription}
          enabled={winback.enabled}
          onToggle={(enabled) => update("winback", { enabled })}
          preview={{
            title: fillTemplate(winback.title, vars),
            body: fillTemplate(winback.message, vars),
            coupon: winback.coupon,
          }}
        >
          <NumberField id="winback-days" label={t.daysAway} value={winback.days} min={7} max={365} onChange={(days) => update("winback", { days })} />
          <TextField id="winback-title" label={t.title} value={winback.title} max={65} onChange={(title) => update("winback", { title })} />
          <TextArea id="winback-message" label={t.message} value={winback.message} onChange={(message) => update("winback", { message })} />
          <div className="grid grid-cols-[minmax(0,1fr)_6rem] gap-2">
            <TextField
              id="winback-coupon"
              label={t.coupon}
              placeholder={t.couponPlaceholder}
              value={winback.coupon}
              max={60}
              onChange={(coupon) => update("winback", { coupon })}
            />
            <NumberField id="winback-coupon-days" label={t.validDays} value={winback.couponDays} min={1} max={60} onChange={(couponDays) => update("winback", { couponDays })} />
          </div>
        </AutomationCard>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button disabled={saving} className="bg-green-600 text-white px-5 py-2 rounded disabled:opacity-50">
          {saving ? m.common.saving : t.save}
        </button>
        {notice && <p className={`text-sm ${notice.ok ? "text-green-700" : "text-red-600"}`}>{notice.text}</p>}
      </div>
    </form>
  );
}

function AutomationCard({
  id,
  title,
  description,
  enabled,
  onToggle,
  preview,
  children,
}: {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  preview: { title: string; body: string; coupon?: string };
  children: React.ReactNode;
}) {
  const { m, f } = useI18n();
  return (
    <fieldset className={`border rounded-lg p-4 flex flex-col gap-3 ${enabled ? "border-green-600" : ""}`}>
      <legend className="sr-only">{title}</legend>
      <label htmlFor={`${id}-enabled`} className="flex items-start justify-between gap-3 cursor-pointer">
        <span>
          <span className="block font-semibold text-gray-900">{title}</span>
          <span className="block text-xs text-gray-500">{description}</span>
        </span>
        <span className="flex items-center gap-2 text-sm shrink-0">
          <input id={`${id}-enabled`} type="checkbox" checked={enabled} onChange={(e) => onToggle(e.target.checked)} />
          {enabled ? m.automations.on : m.automations.off}
        </span>
      </label>
      {children}
      <div className="rounded-lg bg-gray-100 p-3 text-left">
        <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">{m.automations.preview}</p>
        <p className="font-semibold text-gray-900 text-sm">{preview.title}</p>
        <p className="text-sm text-gray-700">{preview.body}</p>
        {preview.coupon ? (
          <p className="mt-2 inline-block border-2 border-dashed border-gray-400 rounded px-2 py-0.5 text-xs font-semibold text-gray-800">
            {f(m.automations.couponPreview, { coupon: preview.coupon })}
          </p>
        ) : null}
      </div>
    </fieldset>
  );
}

function TextField({
  id,
  label,
  value,
  max,
  placeholder,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  max: number;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1 text-xs text-gray-600 min-w-0">
      {label}
      <input
        id={id}
        value={value}
        maxLength={max}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="border p-2 rounded text-sm text-gray-900 min-w-0"
      />
    </label>
  );
}

function TextArea({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1 text-xs text-gray-600">
      {label}
      <textarea
        id={id}
        value={value}
        maxLength={240}
        rows={3}
        onChange={(e) => onChange(e.target.value)}
        className="border p-2 rounded text-sm text-gray-900"
      />
    </label>
  );
}

function NumberField({
  id,
  label,
  value,
  min,
  max,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1 text-xs text-gray-600">
      {label}
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="border p-2 rounded text-sm text-gray-900 tabular-nums"
      />
    </label>
  );
}
