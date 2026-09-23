"use client";
import { useState } from "react";
import Link from "next/link";
import BrandLogo from "./brandLogo";
import { LanguageSwitcher, useI18n } from "../i18n/client";
import { CONTACT_EMAIL } from "../lib/legal";

// Página de ayuda: preguntas frecuentes y formulario que nos llega al panel de administrador.
export default function SupportPage() {
  const { m, f, locale, te } = useI18n();
  const t = m.support;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [business, setBusiness] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");
  const [open, setOpen] = useState(-1);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !message.trim()) {
      setError(t.required);
      return;
    }
    setStatus("sending");
    setError("");
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, business, message, locale }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(te(data.error) ?? t.failed);
      setStatus("sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : t.failed);
      setStatus("idle");
    }
  };

  const field = "border border-[#cfd8d4] rounded-lg p-2.5 text-sm text-[#111418] w-full";

  return (
    <div className="min-h-screen bg-white text-[#111418]">
      <header className="border-b border-[#e6ece9]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <Link href="/" aria-label="Smart Loyalty">
            <BrandLogo size={28} />
          </Link>
          <LanguageSwitcher className="border-[#cfd8d4]" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12 flex flex-col gap-10">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-balance">{t.title}</h1>
          <p className="text-[#4b5560]">{t.lead}</p>
        </div>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-bold">{t.faqTitle}</h2>
          <ul className="flex flex-col divide-y divide-[#e6ece9] border border-[#e6ece9] rounded-xl">
            {t.faq.map((item, i) => (
              <li key={item.q}>
                <button
                  type="button"
                  onClick={() => setOpen(open === i ? -1 : i)}
                  aria-expanded={open === i}
                  className="w-full text-left flex items-center justify-between gap-3 p-4 font-semibold hover:bg-[#f7faf9]"
                >
                  {item.q}
                  <span aria-hidden className="text-[#6b7580] text-lg leading-none">{open === i ? "−" : "+"}</span>
                </button>
                {open === i && <p className="px-4 pb-4 -mt-1 text-[#4b5560]">{item.a}</p>}
              </li>
            ))}
          </ul>
        </section>

        <section id="contacto" className="flex flex-col gap-3">
          <h2 className="text-xl font-bold">{t.formTitle}</h2>
          {status === "sent" ? (
            <div className="border border-[#cfe3d9] bg-[#f2faf6] rounded-xl p-5 flex flex-col items-start gap-2">
              <p className="font-semibold">{t.sentTitle}</p>
              <p className="text-[#4b5560]">{f(t.sentText, { email })}</p>
              <button
                type="button"
                onClick={() => {
                  setMessage("");
                  setStatus("idle");
                }}
                className="text-sm text-[#0e7c66] font-semibold underline"
              >
                {t.another}
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="flex flex-col gap-3 border border-[#e6ece9] rounded-xl p-5">
              <p className="text-sm text-[#4b5560]">{t.formLead}</p>
              <div className="grid sm:grid-cols-2 gap-3">
                <label htmlFor="support-name" className="flex flex-col gap-1 text-xs text-[#6b7580]">
                  {t.name}
                  <input id="support-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="name" className={field} />
                </label>
                <label htmlFor="support-email" className="flex flex-col gap-1 text-xs text-[#6b7580]">
                  {t.email}
                  <input
                    id="support-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    maxLength={120}
                    autoComplete="email"
                    required
                    className={field}
                  />
                </label>
              </div>
              <label htmlFor="support-business" className="flex flex-col gap-1 text-xs text-[#6b7580]">
                {t.business}
                <input id="support-business" value={business} onChange={(e) => setBusiness(e.target.value)} maxLength={80} className={field} />
              </label>
              <label htmlFor="support-message" className="flex flex-col gap-1 text-xs text-[#6b7580]">
                {t.message}
                <textarea
                  id="support-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  maxLength={4000}
                  required
                  placeholder={t.messagePlaceholder}
                  className={field}
                />
              </label>
              <button
                disabled={status === "sending"}
                className="self-start bg-[#0e7c66] text-white rounded-full px-6 py-3 font-semibold hover:bg-[#0b6553] disabled:opacity-60"
              >
                {status === "sending" ? t.sending : t.send}
              </button>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <p className="text-xs text-[#6b7580]">{f(t.otherWays, { email: CONTACT_EMAIL })}</p>
            </form>
          )}
        </section>

        <div className="flex flex-wrap gap-4 text-sm text-[#6b7580]">
          <Link href="/" className="hover:text-[#111418]">
            {t.backHome}
          </Link>
          <Link href="/privacidad" className="hover:text-[#111418]">
            {m.legal.privacyLink}
          </Link>
          <Link href="/terminos" className="hover:text-[#111418]">
            {m.legal.termsLink}
          </Link>
        </div>
      </main>
    </div>
  );
}
