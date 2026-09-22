import type { Metadata } from "next";
import Link from "next/link";
import { Bricolage_Grotesque } from "next/font/google";
import BrandLogo from "./components/brandLogo";
import { fmt } from "./i18n/config";
import { LanguageSwitcher } from "./i18n/client";
import { getI18n } from "./i18n/server";
import type { Messages } from "./i18n/messages";
import { PLAN_PRICE_USD, TRIAL_DAYS } from "./lib/plan";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["600", "800"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const { m } = await getI18n();
  return { title: m.landing.metaTitle, description: m.landing.metaDescription };
}

export default async function Landing() {
  const { m } = await getI18n();
  const t = m.landing;
  const vars = { days: TRIAL_DAYS, price: PLAN_PRICE_USD };

  return (
    <div className="bg-white text-[#111418]">
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-[#e6ece9]">
        <nav className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <Link href="/" aria-label="Smart Loyalty" className="shrink-0">
            <BrandLogo size={30} />
          </Link>
          <div className="hidden lg:flex items-center gap-6 text-sm text-[#4b5560]">
            <a href="#como-funciona" className="hover:text-[#111418]">{t.navHow}</a>
            <a href="#nichos" className="hover:text-[#111418]">{t.navNiches}</a>
            <a href="#funciones" className="hover:text-[#111418]">{t.navFeatures}</a>
            <a href="#preguntas" className="hover:text-[#111418]">{t.navFaq}</a>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <LanguageSwitcher className="hidden sm:block border-[#cfd8d4]" />
            <Link href="/panel" className="hidden sm:block text-sm font-semibold px-3 py-2 rounded-lg whitespace-nowrap hover:bg-[#f4f7f5]">
              {t.login}
            </Link>
            <Link
              href="/registro"
              className="text-sm font-semibold px-3 sm:px-4 py-2 rounded-lg whitespace-nowrap bg-[#0e7c66] text-white hover:bg-[#0b6552]"
            >
              {t.tryFree}
            </Link>
          </div>
        </nav>
      </header>

      <main>
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20 grid gap-12 lg:grid-cols-[1.1fr_0.9fr] items-center">
          <div className="flex flex-col gap-6">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0e7c66]">{t.eyebrow}</p>
            <h1 className={`${display.className} text-4xl sm:text-6xl font-extrabold leading-[1.05] tracking-tight text-balance`}>
              {t.title}
            </h1>
            <p className="text-lg text-[#4b5560] max-w-[34rem]">{t.lead}</p>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/registro"
                className="px-6 py-3.5 rounded-xl bg-[#0e7c66] text-white font-semibold text-lg hover:bg-[#0b6552]"
              >
                {fmt(t.ctaTrial, vars)}
              </Link>
              <a href="#como-funciona" className="px-5 py-3.5 rounded-xl font-semibold border border-[#cfd8d4] hover:bg-[#f4f7f5]">
                {t.ctaHow}
              </a>
            </div>
            <p className="text-sm text-[#6b7580]">{t.noCard}</p>
            <LanguageSwitcher className="sm:hidden self-start border-[#cfd8d4]" />
          </div>

          <PhoneMockup t={t.mock} />
        </section>

        <section id="nichos" className="max-w-6xl mx-auto px-4 sm:px-6 pb-16 flex flex-col gap-8 scroll-mt-20">
          <div className="flex flex-col gap-3 max-w-2xl">
            <h2 className={`${display.className} text-3xl sm:text-4xl font-extrabold tracking-tight text-balance`}>
              {t.nichesTitle}
            </h2>
            <p className="text-[#4b5560]">{t.nichesLead}</p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {t.niches.map((n) => (
              <li key={n.name} className="rounded-2xl border border-[#e6ece9] bg-[#fbfcfb] p-5 flex flex-col gap-3">
                <h3 className="font-bold text-lg leading-snug">{n.name}</h3>
                <p className="flex items-center gap-2 text-sm font-semibold text-[#0b6552]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#f2b134] shrink-0" aria-hidden />
                  {n.reward}
                </p>
                <p className="text-sm text-[#4b5560]">{n.message}</p>
              </li>
            ))}
          </ul>
        </section>

        <section id="como-funciona" className="bg-[#f4f7f5] border-y border-[#e6ece9] scroll-mt-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 flex flex-col gap-10">
            <h2 className={`${display.className} text-3xl sm:text-4xl font-extrabold tracking-tight text-balance`}>
              {t.stepsTitle}
            </h2>
            <ol className="grid gap-6 md:grid-cols-3">
              {t.steps.map((step, i) => (
                <li key={step.title} className="flex flex-col gap-3">
                  <span
                    className={`${display.className} w-10 h-10 rounded-full bg-[#111418] text-white grid place-items-center font-extrabold`}
                  >
                    {i + 1}
                  </span>
                  <h3 className="text-lg font-bold">{step.title}</h3>
                  <p className="text-[#4b5560]">{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="funciones" className="max-w-6xl mx-auto px-4 sm:px-6 py-16 flex flex-col gap-10 scroll-mt-16">
          <div className="flex flex-col gap-3 max-w-2xl">
            <h2 className={`${display.className} text-3xl sm:text-4xl font-extrabold tracking-tight text-balance`}>
              {t.featuresTitle}
            </h2>
            <p className="text-[#4b5560]">{t.featuresLead}</p>
          </div>
          <div className="grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
            {t.features.map((f) => (
              <div key={f.title} className="flex flex-col gap-2 border-t-2 border-[#111418] pt-4">
                <h3 className="font-bold">{f.title}</h3>
                <p className="text-sm text-[#4b5560]">{f.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-[#0e7c66] text-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 grid gap-10 lg:grid-cols-[0.8fr_1.2fr] items-start">
            <div className="flex flex-col gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#f2b134]">{t.automationsEyebrow}</p>
              <h2 className={`${display.className} text-3xl sm:text-4xl font-extrabold tracking-tight text-balance`}>
                {t.automationsTitle}
              </h2>
              <p className="text-white/80">{t.automationsLead}</p>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {t.automations.map((a) => (
                <li key={a.title} className="rounded-xl bg-white/10 border border-white/15 p-4">
                  <p className="font-bold">{a.title}</p>
                  <p className="text-sm text-white/80">{a.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="preguntas" className="max-w-3xl mx-auto px-4 sm:px-6 py-16 flex flex-col gap-8 scroll-mt-16">
          <h2 className={`${display.className} text-3xl sm:text-4xl font-extrabold tracking-tight`}>{t.faqTitle}</h2>
          <div className="divide-y divide-[#e6ece9] border-y border-[#e6ece9]">
            {t.faq.map((item) => (
              <details key={item.q} className="group py-4">
                <summary className="cursor-pointer list-none flex justify-between gap-4 font-semibold">
                  {item.q}
                  <span className="text-[#0e7c66] group-open:rotate-45 transition-transform" aria-hidden>
                    +
                  </span>
                </summary>
                <p className="mt-2 text-[#4b5560]">{fmt(item.a, vars)}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="px-4 sm:px-6 pb-16">
          <div className="max-w-6xl mx-auto rounded-3xl bg-[#111418] text-white px-6 py-12 sm:px-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex flex-col gap-2">
              <h2 className={`${display.className} text-3xl font-extrabold tracking-tight text-balance`}>{t.finalTitle}</h2>
              <p className="text-white/70">{fmt(t.finalLead, vars)}</p>
            </div>
            <Link
              href="/registro"
              className="shrink-0 px-6 py-3.5 rounded-xl bg-[#f2b134] text-[#111418] font-bold text-lg text-center hover:bg-[#e6a322]"
            >
              {t.finalCta}
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#e6ece9]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-wrap items-center justify-between gap-3 text-sm text-[#6b7580]">
          <BrandLogo size={22} />
          <div className="flex flex-wrap items-center gap-4">
            <LanguageSwitcher className="border-[#cfd8d4]" />
            <Link href="/privacidad" className="hover:text-[#111418]">
              {m.legal.privacyLink}
            </Link>
            <Link href="/terminos" className="hover:text-[#111418]">
              {m.legal.termsLink}
            </Link>
            <Link href="/panel" className="hover:text-[#111418]">
              {t.footerPanel}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Ilustración: pantalla bloqueada con una notificación y la tarjeta de puntos (ejemplo).
function PhoneMockup({ t }: { t: Messages["landing"]["mock"] }) {
  return (
    <div className="mx-auto w-full max-w-[300px]" aria-hidden>
      <div
        className="rounded-[2.6rem] border-[10px] border-[#111418] shadow-2xl overflow-hidden px-4 pt-8 pb-10 flex flex-col gap-3"
        style={{ background: "linear-gradient(165deg, #127f69 0%, #0a4a3e 100%)" }}
      >
        <p className="text-center text-white/80 text-xs">{t.day}</p>
        <p className={`${display.className} text-center text-white text-6xl font-semibold mb-4`}>7:42</p>

        <div className="rounded-2xl bg-white/95 p-3 flex gap-3 shadow">
          <span className="w-9 h-9 shrink-0 rounded-lg bg-[#f2b134] grid place-items-center text-xs font-extrabold text-[#111418]">
            {t.initials}
          </span>
          <div className="min-w-0">
            <p className="text-[11px] text-[#6b7580]">
              {t.business} · {t.now}
            </p>
            <p className="text-sm font-bold leading-tight">{t.notifTitle}</p>
            <p className="text-xs text-[#4b5560]">{t.notifBody}</p>
          </div>
        </div>

        <div className="rounded-2xl bg-[#111418] text-white p-4 flex flex-col gap-3 shadow">
          <div className="flex justify-between items-baseline gap-2">
            <p className="text-sm font-bold">{t.business}</p>
            <p className="text-[11px] text-white/60">{t.member}</p>
          </div>
          <p className={`${display.className} text-5xl font-semibold text-[#f2b134] tabular-nums leading-none`}>
            450 <span className="text-sm font-normal text-white/70">{t.points}</span>
          </p>
          <div className="h-2.5 rounded-full bg-white/15 overflow-hidden">
            <div className="h-full w-[90%] rounded-full bg-[#f2b134]" />
          </div>
          <p className="text-xs text-white/80">{t.progress}</p>
        </div>
      </div>
    </div>
  );
}
