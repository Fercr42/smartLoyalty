"use client";
import { useState } from "react";
import Link from "next/link";
import BrandLogo from "./brandLogo";
import { LanguageSwitcher, useI18n } from "../i18n/client";
import { CONTACT_EMAIL } from "../lib/legal";
import { TRIAL_DAYS } from "../lib/plan";

// Página de demo: el dueño deja sus datos y el equipo lo contacta.
export default function DemoPage() {
  const { m, f, locale, te } = useI18n();
  const t = m.demo;
  const [name, setName] = useState("");
  const [business, setBusiness] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [kind, setKind] = useState("");
  const [when, setWhen] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || (!phone.trim() && !email.trim())) {
      setError(t.required);
      return;
    }
    setStatus("sending");
    setError("");
    try {
      const res = await fetch("/api/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, business, phone, email, kind, when, message, locale }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(te(data.error) ?? t.failed);
      setStatus("sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : t.failed);
      setStatus("idle");
    }
  };

  const field = "border border-[#cfd8d4] rounded-lg p-2.5 text-sm text-[#111418] w-full bg-white";

  return (
    <div className="min-h-screen bg-[#f4f7f5] text-[#111418]">
      <header className="bg-white border-b border-[#e6ece9]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <Link href="/" aria-label="Smart Loyalty">
            <BrandLogo size={28} />
          </Link>
          <LanguageSwitcher className="border-[#cfd8d4]" />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12 grid gap-10 lg:grid-cols-[0.95fr_1.05fr] items-start">
        <div className="flex flex-col gap-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0e7c66]">{t.eyebrow}</p>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-balance">{t.title}</h1>
          <p className="text-lg text-[#4b5560]">{t.lead}</p>
          <ul className="flex flex-col gap-3">
            {t.bullets.map((b) => (
              <li key={b} className="flex gap-3 text-[#111418]">
                <span className="mt-1.5 w-2.5 h-2.5 rounded-full bg-[#f2b134] shrink-0" aria-hidden />
                <span>{b}</span>
              </li>
            ))}
          </ul>
          <p className="text-sm text-[#6b7580]">{f(t.orWrite, { email: CONTACT_EMAIL })}</p>
          <Link href="/registro" className="text-sm font-semibold text-[#0e7c66] hover:underline">
            {f(t.tryInstead, { days: TRIAL_DAYS })}
          </Link>
        </div>

        {status === "sent" ? (
          <div className="bg-white border border-[#cfe3d9] rounded-2xl p-7 flex flex-col items-start gap-3">
            <p className="text-2xl font-extrabold">{t.sentTitle}</p>
            <p className="text-[#4b5560]">{f(t.sentText, { contact: phone.trim() || email.trim() })}</p>
            <Link href="/" className="text-sm font-semibold text-[#0e7c66] hover:underline">
              {t.backHome}
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="bg-white border border-[#e6ece9] rounded-2xl p-6 flex flex-col gap-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <label htmlFor="demo-name" className="flex flex-col gap-1 text-xs text-[#6b7580]">
                {t.name}
                <input id="demo-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="name" required className={field} />
              </label>
              <label htmlFor="demo-business" className="flex flex-col gap-1 text-xs text-[#6b7580]">
                {t.business}
                <input id="demo-business" value={business} onChange={(e) => setBusiness(e.target.value)} maxLength={80} className={field} />
              </label>
              <label htmlFor="demo-phone" className="flex flex-col gap-1 text-xs text-[#6b7580]">
                {t.phone}
                <input id="demo-phone" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={40} inputMode="tel" autoComplete="tel" className={field} />
              </label>
              <label htmlFor="demo-email" className="flex flex-col gap-1 text-xs text-[#6b7580]">
                {t.email}
                <input id="demo-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={120} autoComplete="email" className={field} />
              </label>
              <label htmlFor="demo-kind" className="flex flex-col gap-1 text-xs text-[#6b7580]">
                {t.kind}
                <select id="demo-kind" value={kind} onChange={(e) => setKind(e.target.value)} className={field}>
                  <option value="">—</option>
                  {Object.entries(m.niches.types).map(([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label htmlFor="demo-when" className="flex flex-col gap-1 text-xs text-[#6b7580]">
                {t.when}
                <input id="demo-when" value={when} onChange={(e) => setWhen(e.target.value)} maxLength={120} placeholder={t.whenHint} className={field} />
              </label>
            </div>
            <label htmlFor="demo-message" className="flex flex-col gap-1 text-xs text-[#6b7580]">
              {t.message}
              <textarea id="demo-message" value={message} onChange={(e) => setMessage(e.target.value)} rows={3} maxLength={2000} className={field} />
            </label>
            <button
              disabled={status === "sending"}
              className="self-start bg-[#0e7c66] text-white rounded-xl px-6 py-3 font-semibold hover:bg-[#0b6552] disabled:opacity-60"
            >
              {status === "sending" ? t.sending : t.send}
            </button>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </form>
        )}
      </main>
    </div>
  );
}
