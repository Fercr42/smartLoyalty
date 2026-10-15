import type { Metadata } from "next";
import Link from "next/link";
import { Bricolage_Grotesque } from "next/font/google";
import BrandLogo from "./components/brandLogo";
import HeroParallax from "./components/heroParallax";
import ProgramShowcase from "./components/programShowcase";
import ScrollProgress from "./components/scrollProgress";
import Reveal from "./components/reveal";
import StickyHeader from "./components/stickyHeader";
import RoiCalculator from "./components/roiCalculator";
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
    <div className="bg-[#07201b] text-white">
      <ScrollProgress />
      <StickyHeader>
        <nav className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <Link href="/" aria-label="Smart Loyalty" className="shrink-0">
            <BrandLogo size={30} />
          </Link>
          <div className="hidden lg:flex items-center gap-6 text-sm text-[#4b5560]">
            <a href="#como-funciona" className="transition-colors hover:text-white">{t.navHow}</a>
            <a href="#nichos" className="transition-colors hover:text-white">{t.navNiches}</a>
            <a href="#funciones" className="transition-colors hover:text-white">{t.navFeatures}</a>
            <a href="#numeros" className="transition-colors hover:text-white">{t.roiEyebrow}</a>
            <a href="#preguntas" className="transition-colors hover:text-white">{t.navFaq}</a>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <LanguageSwitcher className="hidden sm:block border-[#cfd8d4]" />
            <Link href="/panel" className="hidden sm:block text-sm font-semibold px-3 py-2 rounded-lg whitespace-nowrap hover:bg-[#f4f7f5]">
              {t.login}
            </Link>
            <Link
              href="/registro"
              className="hidden sm:block text-sm font-semibold px-3 py-2 rounded-lg whitespace-nowrap border border-[#cfd8d4] hover:bg-[#f4f7f5]"
            >
              {t.tryFree}
            </Link>
            <Link
              href="/demo"
              className="sl-press text-sm font-semibold px-3 sm:px-4 py-2 rounded-lg whitespace-nowrap bg-[#0e7c66] text-white hover:bg-[#0b6552]"
            >
              {t.ctaDemo}
            </Link>
          </div>
        </nav>
      </StickyHeader>

      <main>
        {/* Héroe oscuro: el titular, la tarjeta del cliente flotando y lo que ve el empleado. */}
        <section className="relative overflow-hidden bg-[#07201b] text-white">
          <div
            className="sl-glow pointer-events-none absolute -top-40 -right-24 h-[34rem] w-[34rem] rounded-full blur-3xl"
            style={{ background: "radial-gradient(circle, rgba(25,197,138,0.35) 0%, rgba(7,32,27,0) 70%)" }}
            aria-hidden
          />
          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 grid gap-14 lg:grid-cols-[1.05fr_0.95fr] items-center">
            <div className="flex flex-col gap-6 sl-rise">
              <p className="inline-flex self-start items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9fe3cd]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#f2b134]" aria-hidden />
                {t.eyebrow}
              </p>
              <h1 className={`${display.className} text-4xl sm:text-6xl font-extrabold leading-[1.03] tracking-tight text-balance`}>
                <Highlighted text={t.title} mark={t.titleMark} />
              </h1>
              <p className="text-lg text-white/75 max-w-[34rem]">{t.lead}</p>
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/demo"
                  className="sl-press px-6 py-3.5 rounded-xl bg-[#f2b134] text-[#07201b] font-bold text-lg hover:bg-[#ffc04d]"
                >
                  {t.ctaDemo}
                </Link>
                <Link
                  href="/registro"
                  className="sl-press px-5 py-3.5 rounded-xl font-semibold border border-white/25 text-white hover:bg-white/10"
                >
                  {fmt(t.ctaTrial, vars)}
                </Link>
              </div>
              <p className="text-sm text-white/55">{t.noCard}</p>
              <LanguageSwitcher className="sm:hidden self-start border-white/25 bg-white/10 text-white" />
            </div>

            <HeroParallax>
              <HeroStack t={t} />
            </HeroParallax>
          </div>

          {/* Cinta con los rubros: el visitante se busca a sí mismo. */}
          <div className="sl-marquee-wrap relative border-t border-white/10 py-4 overflow-hidden">
            <div className="flex w-max gap-10 sl-marquee" aria-hidden>
              {[...t.niches, ...t.niches].map((n, i) => (
                <span key={`${n.name}-${i}`} className="flex items-center gap-10 text-sm font-semibold text-white/55 whitespace-nowrap">
                  {n.name}
                  <span className="w-1.5 h-1.5 rounded-full bg-[#f2b134]" />
                </span>
              ))}
            </div>
            <p className="sr-only">{t.marqueeLabel}</p>
          </div>
        </section>

        {/* Lo que el dueño recibe sin hacer nada: datos del producto, no promesas. */}
        <section className="border-b border-white/10 bg-[#0a2a23]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {t.trust.map((item) => (
              <div key={item.value} className="flex flex-col gap-1">
                <p className={`${display.className} text-2xl font-extrabold tracking-tight text-[#19c58a]`}>{item.value}</p>
                <p className="text-sm text-white/65">{item.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Selector vivo: sellos, puntos o cashback. */}
        <section id="programas" className="relative overflow-hidden scroll-mt-16">
          <div
            className="sl-aurora pointer-events-none absolute -left-32 top-10 h-[28rem] w-[28rem] rounded-full blur-3xl"
            style={{ background: "radial-gradient(circle, rgba(242,177,52,0.18) 0%, rgba(7,32,27,0) 70%)" }}
            aria-hidden
          />
          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-16 flex flex-col gap-8">
          <div className="flex flex-col gap-3 max-w-2xl">
            <h2 className={`${display.className} text-3xl sm:text-4xl font-extrabold tracking-tight text-balance`}>
              {t.modesTitle}
            </h2>
            <p className="text-white/70">{t.modesLead}</p>
          </div>
          <ProgramShowcase />
          </div>
        </section>

        {/* Antes y después: el problema que ya tiene el dueño y qué cambia. */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 flex flex-col gap-8">
          <Reveal className="flex flex-col gap-3 max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0e7c66]">{t.storyEyebrow}</p>
            <h2 className={`${display.className} text-3xl sm:text-4xl font-extrabold tracking-tight text-balance`}>
              {t.storyTitle}
            </h2>
            <p className="text-white/70">{t.storyLead}</p>
          </Reveal>
          <div className="grid gap-5 md:grid-cols-2">
            <Reveal className="sl-lift rounded-2xl border border-white/10 bg-white/[0.04] p-6 flex flex-col gap-4">
              <h3 className="font-bold text-white/55">{t.storyBeforeTitle}</h3>
              <ul className="flex flex-col gap-3">
                {t.storyBefore.map((item) => (
                  <li key={item} className="flex gap-3 text-white/60">
                    <span className="mt-2 w-2.5 h-2.5 rounded-full bg-white/25 shrink-0" aria-hidden />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
            <Reveal delay={120} className="sl-lift rounded-2xl border-2 border-[#19c58a] bg-[#0b352c] p-6 flex flex-col gap-4">
              <h3 className="font-bold text-[#19c58a]">{t.storyAfterTitle}</h3>
              <ul className="flex flex-col gap-3">
                {t.storyAfter.map((item) => (
                  <li key={item} className="flex gap-3 text-white/85">
                    <span className="mt-2 w-2.5 h-2.5 rounded-full bg-[#f2b134] shrink-0 sl-pulse" aria-hidden />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </section>

        <section id="nichos" className="max-w-6xl mx-auto px-4 sm:px-6 pb-16 flex flex-col gap-8 scroll-mt-20">
          <div className="flex flex-col gap-3 max-w-2xl">
            <h2 className={`${display.className} text-3xl sm:text-4xl font-extrabold tracking-tight text-balance`}>
              {t.nichesTitle}
            </h2>
            <p className="text-white/70">{t.nichesLead}</p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {t.niches.map((n, i) => (
              <Reveal key={n.name} delay={(i % 4) * 80} className="sl-lift sl-tap rounded-2xl border border-white/12 bg-white/5 p-5 flex flex-col gap-3">
                <h3 className="font-bold text-lg leading-snug">{n.name}</h3>
                <p className="flex items-center gap-2 text-sm font-semibold text-[#ffd98a]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#f2b134] shrink-0" aria-hidden />
                  {n.reward}
                </p>
                <p className="text-sm text-white/65">{n.message}</p>
              </Reveal>
            ))}
          </ul>
        </section>

        <section id="como-funciona" className="bg-[#f6f4ee] text-[#111418] border-y border-black/10 scroll-mt-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 flex flex-col gap-10">
            <h2 className={`${display.className} text-3xl sm:text-4xl font-extrabold tracking-tight text-balance`}>
              {t.stepsTitle}
            </h2>
            <ol className="grid gap-6 md:grid-cols-3">
              {t.steps.map((step, i) => (
                <Reveal key={step.title} delay={i * 110} className="flex flex-col gap-3">
                  <span
                    className={`${display.className} w-10 h-10 rounded-full bg-[#111418] text-white grid place-items-center font-extrabold`}
                  >
                    {i + 1}
                  </span>
                  <h3 className="text-lg font-bold">{step.title}</h3>
                  <p className="text-[#4b5560]">{step.text}</p>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>

        <section id="funciones" className="max-w-6xl mx-auto px-4 sm:px-6 py-16 flex flex-col gap-10 scroll-mt-16">
          <div className="flex flex-col gap-3 max-w-2xl">
            <h2 className={`${display.className} text-3xl sm:text-4xl font-extrabold tracking-tight text-balance`}>
              {t.featuresTitle}
            </h2>
            <p className="text-white/70">{t.featuresLead}</p>
          </div>
          <div className="grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
            {t.features.map((f, i) => (
              <Reveal key={f.title} delay={(i % 4) * 90} className="flex flex-col gap-2 border-t-2 border-[#19c58a] pt-4">
                <h3 className="font-bold">{f.title}</h3>
                <p className="text-sm text-white/65">{f.text}</p>
              </Reveal>
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
              {t.automations.map((a, i) => (
                <Reveal key={a.title} delay={i * 130} className="sl-lift rounded-xl bg-white/10 border border-white/15 p-4">
                  <p className="font-bold">{a.title}</p>
                  <p className="text-sm text-white/80">{a.text}</p>
                </Reveal>
              ))}
            </ul>
          </div>
        </section>

        {/* Calculadora: el dueño mueve sus propios números. */}
        <section id="numeros" className="max-w-6xl mx-auto px-4 sm:px-6 py-16 flex flex-col gap-8 scroll-mt-16">
          <div className="flex flex-col gap-3 max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0e7c66]">{t.roiEyebrow}</p>
            <h2 className={`${display.className} text-3xl sm:text-4xl font-extrabold tracking-tight text-balance`}>
              {t.roiTitle}
            </h2>
            <p className="text-white/70">{t.roiLead}</p>
          </div>
          <RoiCalculator />
        </section>

        {/* Invitación a la demo, antes de las preguntas. */}
        <section className="px-4 sm:px-6 pb-4">
          <div className="max-w-6xl mx-auto rounded-3xl border border-white/12 bg-white/5 px-6 py-10 sm:px-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex flex-col gap-2 max-w-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0e7c66]">{t.demoBandEyebrow}</p>
              <h2 className={`${display.className} text-2xl sm:text-3xl font-extrabold tracking-tight text-balance`}>
                {t.demoBandTitle}
              </h2>
              <p className="text-white/70">{t.demoBandLead}</p>
            </div>
            <div className="flex flex-wrap gap-3 shrink-0">
              <Link
                href="/demo"
                className="sl-press sl-shine px-6 py-3.5 rounded-xl bg-[#19c58a] text-[#07201b] font-bold text-center hover:bg-[#2fe0a2]"
              >
                {t.demoBandCta}
              </Link>
              <Link
                href="/soporte#contacto"
                className="sl-press px-5 py-3.5 rounded-xl font-semibold border border-white/25 text-white text-center hover:bg-white/10"
              >
                {t.demoBandSales}
              </Link>
            </div>
          </div>
        </section>

        <section id="preguntas" className="max-w-3xl mx-auto px-4 sm:px-6 py-16 flex flex-col gap-8 scroll-mt-16">
          <h2 className={`${display.className} text-3xl sm:text-4xl font-extrabold tracking-tight`}>{t.faqTitle}</h2>
          <div className="divide-y divide-white/10 border-y border-white/10">
            {t.faq.map((item) => (
              <details key={item.q} className="group py-4">
                <summary className="cursor-pointer list-none flex justify-between gap-4 font-semibold">
                  {item.q}
                  <span className="text-[#f2b134] group-open:rotate-45 transition-transform duration-300" aria-hidden>
                    +
                  </span>
                </summary>
                <div className="sl-faq-body">
                  <div>
                    <p className="mt-2 text-white/70">{fmt(item.a, vars)}</p>
                  </div>
                </div>
              </details>
            ))}
          </div>
        </section>

        <section className="px-4 sm:px-6 pb-16">
          <div className="relative overflow-hidden max-w-6xl mx-auto rounded-3xl bg-[#0b352c] text-white px-6 py-12 sm:px-12 flex flex-col md:flex-row md:items-center justify-between gap-6 border border-white/10">
            <div className="flex flex-col gap-2">
              <h2 className={`${display.className} text-3xl font-extrabold tracking-tight text-balance`}>{t.finalTitle}</h2>
              <p className="text-white/70">{fmt(t.finalLead, vars)}</p>
            </div>
            <div className="flex flex-wrap gap-3 shrink-0">
              <Link
                href="/registro"
                className="sl-press sl-shine px-6 py-3.5 rounded-xl bg-[#f2b134] text-[#07201b] font-bold text-lg text-center hover:bg-[#ffc04d]"
              >
                {t.finalCta}
              </Link>
              <Link
                href="/demo"
                className="px-5 py-3.5 rounded-xl border border-white/30 text-white font-semibold text-center hover:bg-white/10"
              >
                {t.ctaDemo}
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-[#061a16]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-wrap items-center justify-between gap-3 text-sm text-white/55">
          <BrandLogo size={22} />
          <div className="flex flex-wrap items-center gap-4">
            <LanguageSwitcher className="border-[#cfd8d4]" />
            <Link href="/demo" className="transition-colors hover:text-white">
              {t.ctaDemo}
            </Link>
            <Link href="/soporte" className="transition-colors hover:text-white">
              {m.support.supportLink}
            </Link>
            <Link href="/privacidad" className="transition-colors hover:text-white">
              {m.legal.privacyLink}
            </Link>
            <Link href="/terminos" className="transition-colors hover:text-white">
              {m.legal.termsLink}
            </Link>
            <Link href="/panel" className="transition-colors hover:text-white">
              {t.footerPanel}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Titular con la frase clave subrayada a mano. Si la frase no aparece, se escribe tal cual.
function Highlighted({ text, mark }: { text: string; mark: string }) {
  const at = mark ? text.indexOf(mark) : -1;
  if (at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <span className="sl-mark">{mark}</span>
      {text.slice(at + mark.length)}
    </>
  );
}

// Lo que ve el cliente y lo que ve el empleado, flotando sobre el héroe.
function HeroStack({ t }: { t: Messages["landing"] }) {
  return (
    <div className="relative mx-auto w-full max-w-[26rem] py-6">
      {/* Notificación que recibe el cliente. */}
      <div
        className="sl-float relative z-20 ml-auto w-[19rem] rounded-2xl bg-white text-[#111418] p-4 shadow-2xl flex gap-3"
        style={{ ["--sl-tilt" as string]: "-2deg" }}
      >
        <span className="w-10 h-10 shrink-0 rounded-xl bg-[#f2b134] grid place-items-center text-xs font-extrabold">
          {t.mock.initials}
        </span>
        <div className="min-w-0">
          <p className="text-[11px] text-[#6b7580]">
            {t.heroCardBusiness} · {t.mock.now}
          </p>
          <p className="text-sm font-bold leading-tight">{t.heroNotifTitle}</p>
          <p className="text-xs text-[#4b5560]">{t.heroNotifBody}</p>
        </div>
      </div>

      {/* Tarjeta del cliente. */}
      <div
        className="sl-float-slow relative z-10 -mt-6 w-full rounded-[1.75rem] p-6 text-white shadow-2xl flex flex-col gap-5"
        style={{
          background: "linear-gradient(150deg, #10907a 0%, #0a4a3e 60%, #06302a 100%)",
          ["--sl-tilt" as string]: "1.5deg",
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-bold text-lg leading-tight">{t.heroCardBusiness}</p>
            <p className="text-xs text-white/70">{t.heroCardMember}</p>
          </div>
          <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide">
            {t.mock.points}
          </span>
        </div>
        <div className="flex flex-col items-center gap-3">
          <p className="text-5xl font-extrabold tabular-nums text-[#f2b134] leading-none">450</p>
          <div className="w-full h-2.5 rounded-full bg-white/20 overflow-hidden">
            <div className="h-full w-[90%] rounded-full bg-[#f2b134]" />
          </div>
          <p className="text-xs text-white/75">{t.mock.progress}</p>
        </div>
      </div>

      {/* Lo que marca el empleado en caja. */}
      <div
        className="sl-float relative z-20 -mt-4 mr-auto w-[16rem] rounded-2xl bg-[#111418] text-white p-4 shadow-2xl"
        style={{ ["--sl-tilt" as string]: "-3deg" }}
      >
        <p className="text-[10px] uppercase tracking-[0.14em] text-white/50">{t.heroScanner}</p>
        <p className="text-sm font-semibold mt-1">{t.heroScannerLine}</p>
      </div>
    </div>
  );
}
