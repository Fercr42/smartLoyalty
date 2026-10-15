import Link from "next/link";
import "@fontsource-variable/bricolage-grotesque/standard.css";
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import "@fontsource-variable/noto-sans-thai";
import "lenis/dist/lenis.css";
import "./nueva.css";
import Scene3D from "./components/scene3d";
import Loader from "./components/loader";
import Cursor from "./components/cursor";
import Choreo from "./components/choreo";
import Magnetic from "./components/magnetic";
import Simulator from "./components/simulator";
import Pricing from "./components/pricing";
import StepQr from "./components/stepQr";
import { Chars, Words, graphemes } from "./components/split";
import { NV_COPY } from "./copy";
import { LanguageSwitcher } from "../i18n/client";
import type { Locale } from "../i18n/config";
import { TRIAL_DAYS } from "../lib/plan";

// Portada: escena 3D, scroll animado, simulador y precios, en español, inglés y tailandés. La usa app/page.tsx.

const STEP_ART = ["qr", "tap", "chart"];

function StepArt({ kind }: { kind: string }) {
  if (kind === "qr") return <StepQr />;
  if (kind === "tap")
    return (
      <div className="nv-art-tap" aria-hidden>
        <span className="nv-art-phone">
          <span className="nv-art-card" />
        </span>
        <span className="nv-art-ripple" />
        <span className="nv-art-ripple" style={{ animationDelay: "0.8s" }} />
      </div>
    );
  return (
    <div className="nv-art-chart" aria-hidden>
      {[34, 48, 41, 62, 58, 77, 92].map((h, i) => (
        <i key={i} style={{ height: `${h}%`, ["--d" as string]: `${i * 90}ms` }} />
      ))}
    </div>
  );
}

export default function NuevaLanding({ locale }: { locale: Locale }) {
  const t = NV_COPY[locale];
  return (
    <div className={`nv nv-lang-${locale}`} data-nv>
      <Scene3D />
      <div className="nv-veil" aria-hidden />
      <Loader />
      <Cursor />
      <Choreo />

      <a href="#contenido" className="nv-skip">
        {t.nav.skip}
      </a>

      <header className="nv-nav" data-nav>
        <Link href="/" className="nv-brand" aria-label={t.nav.home}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/mark.png" alt="" width={28} height={28} />
          <span>Smart Loyalty</span>
        </Link>
        <nav aria-label={t.nav.sections} className="nv-nav-links">
          <a href="#como-funciona">{t.nav.how}</a>
          <a href="#pruebalo">{t.nav.try}</a>
          <a href="#precios">{t.nav.pricing}</a>
        </nav>
        <div className="nv-nav-actions">
          <LanguageSwitcher className="nv-lang" />
          <Link href="/panel" className="nv-nav-login">
            {t.nav.login}
          </Link>
          <Magnetic>
            <Link href="/registro" className="nv-btn nv-btn-primary nv-btn-sm" data-cursor={t.nav.cursorStart}>
              {t.nav.tryFree}
            </Link>
          </Magnetic>
        </div>
      </header>

      <div className="nv-hud" aria-hidden>
        <span data-hud-num>01 / 07</span>
        <span data-hud-name>{t.hud.hero}</span>
      </div>

      <main id="contenido">
        {/* 1 · Hero */}
        <section className="nv-hero" data-scene="hero" data-hud={t.hud.hero}>
          <h1 className="nv-hero-title">
            <Chars text={t.hero.line1} className="nv-line" />
            <Chars text={t.hero.line2} className="nv-line nv-line-indent" />
          </h1>
          <div className="nv-hero-foot">
            <p className="nv-hero-lead">{t.hero.lead}</p>
            <div className="nv-hero-cta">
              <Magnetic>
                <Link href="/registro" className="nv-btn nv-btn-primary nv-btn-lg" data-cursor={t.nav.cursorStart}>
                  {t.hero.cta(TRIAL_DAYS)}
                </Link>
              </Magnetic>
              <a href="#como-funciona" className="nv-link" data-cursor={t.hero.cursorDown}>
                {t.hero.how}
              </a>
            </div>
            <p className="nv-hero-note">{t.hero.note}</p>
          </div>
          <div className="nv-scroll-cue" aria-hidden>
            <span />
            {t.hero.scroll}
          </div>
        </section>

        {/* 2 · Propuesta de valor: sección fija con tres escenas */}
        <section id="como-funciona" className="nv-value" data-pin="value" data-hud={t.hud.how}>
          <div className="nv-value-inner">
            <h2 className="nv-value-title">{t.value.title}</h2>
            <div className="nv-beats">
              {t.value.beats.map((b, i) => (
                <article key={b.verb} className="nv-beat" data-beat>
                  <p className="nv-beat-verb" aria-hidden>
                    {graphemes(b.verb).map((ch, c) => (
                      <span key={c} className="nv-beat-char-mask">
                        <span className="nv-beat-char" style={{ ["--i" as string]: c }}>
                          {ch}
                        </span>
                      </span>
                    ))}
                  </p>
                  <h3 className="sr-only">{b.verb}</h3>
                  <p className="nv-beat-text">{b.text}</p>
                  <p className="nv-beat-data">
                    <span className="nv-beat-dot" aria-hidden />
                    {b.data}
                  </p>
                  <span className="sr-only">{t.value.stepOf(i + 1, t.value.beats.length)}</span>
                </article>
              ))}
            </div>
            <div className="nv-ticks" aria-hidden>
              {t.value.beats.map((b) => (
                <span key={b.verb} data-tick>
                  {b.verb.replace(".", "")}
                </span>
              ))}
            </div>
            <span className="nv-value-progress" aria-hidden>
              <i data-progress />
            </span>
          </div>
        </section>

        {/* 3 · Producto: simulador */}
        <section id="pruebalo" className="nv-sim" data-scene="sim" data-hud={t.hud.try}>
          <div className="nv-container">
            <h2 className="nv-h2" data-reveal>
              <Words text={t.sim.title} />
            </h2>
            <p className="nv-lead" data-reveal>
              <Words text={t.sim.lead} />
            </p>
            <Simulator />
          </div>
        </section>

        {/* 4 · Cifras y rubros */}
        <section className="nv-numbers" data-scene="numbers" data-hud={t.hud.ready}>
          <div className="nv-container">
            <h2 className="nv-h2" data-reveal>
              <Words text={t.figures.title} />
            </h2>
            <dl className="nv-figures">
              {t.figures.items.map((f, i) => (
                <div key={f.label} className="nv-figure" data-speed={i % 2 ? 0.35 : 0}>
                  <dt className="nv-figure-n">
                    <span data-count={f.n}>{f.n}</span>
                    <small>{f.unit}</small>
                  </dt>
                  <dd className="nv-figure-label">{f.label}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="nv-marquee" aria-label={`${t.figures.madeFor}: ${t.figures.niches.join(", ")}`}>
            <p className="nv-marquee-title">{t.figures.nichesTitle}</p>
            <div className="nv-marquee-track" data-marquee aria-hidden>
              {[...t.figures.niches, ...t.figures.niches].map((n, i) => (
                <span key={i} className={i % 2 ? "is-outline" : ""}>
                  {n}
                  <i className="nv-marquee-star" />
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* 5 · Proceso: tres pasos en horizontal */}
        <section className="nv-steps" data-hscroll data-scene="steps" data-hud={t.hud.steps}>
          <div className="nv-steps-track" data-htrack>
            <div className="nv-steps-intro">
              <h2 className="nv-h2" data-reveal>
                <Words text={t.steps.title} />
              </h2>
              <p className="nv-lead">{t.steps.lead}</p>
            </div>
            {t.steps.items.map((s, i) => (
              <article key={s.title} className="nv-step">
                <span className="nv-step-num" data-step-num aria-hidden>
                  {i + 1}
                </span>
                <StepArt kind={STEP_ART[i]} />
                <h3 className="nv-step-title">
                  <span className="sr-only">{t.steps.stepLabel(i + 1)}</span>
                  {s.title}
                </h3>
                <p className="nv-step-text">{s.text}</p>
              </article>
            ))}
          </div>
        </section>

        {/* 6 · Precios (fondo claro) */}
        <section id="precios" className="nv-pricing" data-opaque data-hud={t.hud.pricing}>
          <div className="nv-container">
            <h2 className="nv-h2 nv-h2-dark" data-reveal>
              <Words text={t.pricing.title} />
            </h2>
            <p className="nv-lead nv-lead-dark">{t.pricing.lead(TRIAL_DAYS)}</p>
            <Pricing />
          </div>
        </section>

        {/* 7 · Cierre */}
        <section className="nv-final" data-final data-scene="final" data-hud={t.hud.start}>
          <h2 className="nv-final-title">
            <Chars text={t.final.line1} className="nv-line" />
            <Chars text={t.final.line2} className="nv-line" />
          </h2>
          <p className="nv-final-lead">{t.final.lead(TRIAL_DAYS)}</p>
          <div className="nv-final-cta">
            <Magnetic strength={0.5}>
              <Link href="/registro" className="nv-orb" data-cursor={t.final.cursor}>
                <span>{t.final.cta}</span>
              </Link>
            </Magnetic>
            <Link href="/demo" className="nv-link">
              {t.final.demo}
            </Link>
          </div>
        </section>
      </main>

      <footer className="nv-footer" data-scene="footer">
        <div className="nv-footer-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/mark.png" alt="" width={36} height={36} />
          <p>
            Smart Loyalty
            <span>{t.footer.tagline}</span>
          </p>
        </div>
        <nav className="nv-footer-cols" aria-label={t.footer.label}>
          <div>
            <p>{t.footer.product}</p>
            <a href="#como-funciona">{t.nav.how}</a>
            <a href="#pruebalo">{t.nav.try}</a>
            <a href="#precios">{t.nav.pricing}</a>
            <Link href="/demo">{t.footer.demo}</Link>
          </div>
          <div>
            <p>{t.footer.account}</p>
            <Link href="/panel">{t.nav.login}</Link>
            <Link href="/registro">{t.footer.signup}</Link>
          </div>
          <div>
            <p>{t.footer.help}</p>
            <Link href="/soporte">{t.footer.support}</Link>
            <Link href="/privacidad">{t.footer.privacy}</Link>
            <Link href="/terminos">{t.footer.terms}</Link>
          </div>
        </nav>
        <p className="nv-footer-copy">© {new Date().getFullYear()} Smart Loyalty</p>
      </footer>
    </div>
  );
}
