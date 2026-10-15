import type { Metadata } from "next";
import Link from "next/link";
import "@fontsource-variable/bricolage-grotesque/standard.css";
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
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
import { Chars, Words } from "./components/split";
import { TRIAL_DAYS } from "../lib/plan";

// Landing experimental (rama landing-3d). No se indexa mientras está en prueba.
export const metadata: Metadata = {
  title: "Smart Loyalty · Clientes que vuelven",
  description:
    "La tarjeta de lealtad de tu negocio en el celular de tus clientes: puntos, notificaciones y reseñas en Google, sin que nadie descargue una app.",
  robots: { index: false, follow: false },
};

const BEATS = [
  {
    verb: "Suma.",
    text: "Cada compra se convierte en sellos, puntos o cashback. Tu empleado escanea con su PIN y la tarjeta del cliente se actualiza sola.",
    data: "₡12.000 en caja = +240 puntos",
  },
  {
    verb: "Avisa.",
    text: "Tus promociones llegan a la pantalla de bloqueo. A todos, solo a los frecuentes o a los que llevan semanas sin venir.",
    data: "Viernes 5:00 p. m.: puntos dobles",
  },
  {
    verb: "Recomienda.",
    text: "Dos minutos después de la compra llega una encuesta corta. A quien quedó contento se le pide la reseña en Google.",
    data: "Encuesta enviada, reseña pedida",
  },
];

const NICHES = [
  "Restaurantes y cafés",
  "Barberías",
  "Salones de belleza",
  "Spas",
  "Gimnasios",
  "Lavacar",
  "Veterinarias",
  "Minisúper",
];

const STEPS = [
  {
    title: "Pon tu QR a la vista",
    text: "Te registras, subes tu logo y descargas tu código. Lo pones en el mostrador, la caja, las mesas o el espejo.",
    art: "qr",
  },
  {
    title: "Tus clientes se unen en un toque",
    text: "Escanean, activan las notificaciones y guardan su tarjeta. Sin descargar ninguna app.",
    art: "tap",
  },
  {
    title: "Tú los haces volver",
    text: "Sumas según el monto, mandas promociones, das cupones y ves en tus estadísticas quién regresa.",
    art: "chart",
  },
];

const FIGURES = [
  { n: 10, unit: "min", label: "desde que te registras hasta tener tu QR impreso" },
  { n: 0, unit: "apps", label: "que tus clientes tienen que descargar" },
  { n: 2, unit: "min", label: "después de la compra sale la encuesta de reseña" },
  { n: 3, unit: "idiomas", label: "español, inglés y tailandés, según el celular de cada cliente" },
];

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

export default function Nueva() {
  return (
    <div className="nv" data-nv>
      <Scene3D />
      <div className="nv-veil" aria-hidden />
      <Loader />
      <Cursor />
      <Choreo />

      <a href="#contenido" className="nv-skip">
        Saltar al contenido
      </a>

      <header className="nv-nav" data-nav>
        <Link href="/" className="nv-brand" aria-label="Smart Loyalty, inicio">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/mark.png" alt="" width={28} height={28} />
          <span>Smart Loyalty</span>
        </Link>
        <nav aria-label="Secciones" className="nv-nav-links">
          <a href="#como-funciona">Cómo funciona</a>
          <a href="#pruebalo">Pruébalo</a>
          <a href="#precios">Precios</a>
        </nav>
        <div className="nv-nav-actions">
          <Link href="/panel" className="nv-nav-login">
            Entrar
          </Link>
          <Magnetic>
            <Link href="/registro" className="nv-btn nv-btn-primary nv-btn-sm" data-cursor="Empezar">
              Probar gratis
            </Link>
          </Magnetic>
        </div>
      </header>

      <div className="nv-hud" aria-hidden>
        <span data-hud-num>01 / 07</span>
        <span data-hud-name>Inicio</span>
      </div>

      <main id="contenido">
        {/* 1 · Hero */}
        <section className="nv-hero" data-scene="hero" data-hud="Inicio">
          <h1 className="nv-hero-title">
            <Chars text="Clientes" className="nv-line" />
            <Chars text="que vuelven." className="nv-line nv-line-indent" />
          </h1>
          <div className="nv-hero-foot">
            <p className="nv-hero-lead">
              La tarjeta de lealtad de tu negocio, en el celular de tus clientes. Suma puntos, avisa tus promociones y consigue reseñas en
              Google, sin que nadie descargue una app.
            </p>
            <div className="nv-hero-cta">
              <Magnetic>
                <Link href="/registro" className="nv-btn nv-btn-primary nv-btn-lg" data-cursor="Empezar">
                  Probar {TRIAL_DAYS} días gratis
                </Link>
              </Magnetic>
              <a href="#como-funciona" className="nv-link" data-cursor="Bajar">
                Ver cómo funciona
              </a>
            </div>
            <p className="nv-hero-note">Sin tarjeta de crédito. Tu QR listo en 10 minutos.</p>
          </div>
          <div className="nv-scroll-cue" aria-hidden>
            <span />
            Desliza
          </div>
        </section>

        {/* 2 · Propuesta de valor: sección fija con tres escenas */}
        <section id="como-funciona" className="nv-value" data-pin="value" data-hud="Cómo funciona">
          <div className="nv-value-inner">
            <h2 className="nv-value-title">Tres cosas que la tarjeta de cartón nunca hizo</h2>
            <div className="nv-beats">
              {BEATS.map((b, i) => (
                <article key={b.verb} className="nv-beat" data-beat>
                  <p className="nv-beat-verb" aria-hidden>
                    {[...b.verb].map((ch, c) => (
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
                  <span className="sr-only">
                    Paso {i + 1} de {BEATS.length}
                  </span>
                </article>
              ))}
            </div>
            <div className="nv-ticks" aria-hidden>
              {BEATS.map((b) => (
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
        <section id="pruebalo" className="nv-sim" data-scene="sim" data-hud="Pruébalo">
          <div className="nv-container">
            <h2 className="nv-h2" data-reveal>
              <Words text="Pruébalo aquí mismo." />
            </h2>
            <p className="nv-lead" data-reveal>
              <Words text="Así lo vive tu cliente. Elige cómo premias, escanea una compra y mira qué le llega al celular." />
            </p>
            <Simulator />
          </div>
        </section>

        {/* 4 · Cifras y rubros */}
        <section className="nv-numbers" data-scene="numbers" data-hud="Lo que viene listo">
          <div className="nv-container">
            <h2 className="nv-h2" data-reveal>
              <Words text="Lo que ya viene listo" />
            </h2>
            <dl className="nv-figures">
              {FIGURES.map((f, i) => (
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
          <div className="nv-marquee" aria-label={`Hecho para: ${NICHES.join(", ")}`}>
            <p className="nv-marquee-title">Hecho para negocios donde el cliente vuelve</p>
            <div className="nv-marquee-track" data-marquee aria-hidden>
              {[...NICHES, ...NICHES].map((n, i) => (
                <span key={i} className={i % 2 ? "is-outline" : ""}>
                  {n}
                  <i className="nv-marquee-star" />
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* 5 · Proceso: tres pasos en horizontal */}
        <section className="nv-steps" data-hscroll data-scene="steps" data-hud="Tres pasos">
          <div className="nv-steps-track" data-htrack>
            <div className="nv-steps-intro">
              <h2 className="nv-h2" data-reveal>
                <Words text="Listo en tres pasos" />
              </h2>
              <p className="nv-lead">Sin técnicos, sin instalar nada en caja. Si tienes celular, ya tienes todo.</p>
            </div>
            {STEPS.map((s, i) => (
              <article key={s.title} className="nv-step">
                <span className="nv-step-num" data-step-num aria-hidden>
                  {i + 1}
                </span>
                <StepArt kind={s.art} />
                <h3 className="nv-step-title">
                  <span className="sr-only">Paso {i + 1}: </span>
                  {s.title}
                </h3>
                <p className="nv-step-text">{s.text}</p>
              </article>
            ))}
          </div>
        </section>

        {/* 6 · Precios (fondo claro) */}
        <section id="precios" className="nv-pricing" data-opaque data-hud="Precios">
          <div className="nv-container">
            <h2 className="nv-h2 nv-h2-dark" data-reveal>
              <Words text="Un plan para cada etapa de tu negocio" />
            </h2>
            <p className="nv-lead nv-lead-dark">
              Empiezas con {TRIAL_DAYS} días gratis con todo lo de Pro. Después eliges plan y pagas con SINPE Móvil, PayPal o tarjeta. Cancelas
              cuando quieras.
            </p>
            <Pricing />
          </div>
        </section>

        {/* 7 · Cierre */}
        <section className="nv-final" data-final data-scene="final" data-hud="Empieza">
          <h2 className="nv-final-title">
            <Chars text="Tu próximo cliente frecuente" className="nv-line" />
            <Chars text="ya está en tu negocio." className="nv-line" />
          </h2>
          <p className="nv-final-lead">{TRIAL_DAYS} días gratis. Sin tarjeta de crédito.</p>
          <div className="nv-final-cta">
            <Magnetic strength={0.5}>
              <Link href="/registro" className="nv-orb" data-cursor="¡Vamos!">
                <span>Registrar mi negocio</span>
              </Link>
            </Magnetic>
            <Link href="/demo" className="nv-link">
              Prefiero agendar una demo
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
            <span>Hecho en Costa Rica para negocios donde el cliente vuelve.</span>
          </p>
        </div>
        <nav className="nv-footer-cols" aria-label="Pie de página">
          <div>
            <p>Producto</p>
            <a href="#como-funciona">Cómo funciona</a>
            <a href="#pruebalo">Pruébalo</a>
            <a href="#precios">Precios</a>
            <Link href="/demo">Agendar demo</Link>
          </div>
          <div>
            <p>Cuenta</p>
            <Link href="/panel">Entrar</Link>
            <Link href="/registro">Registrar mi negocio</Link>
          </div>
          <div>
            <p>Ayuda</p>
            <Link href="/soporte">Soporte</Link>
            <Link href="/privacidad">Privacidad</Link>
            <Link href="/terminos">Términos</Link>
          </div>
        </nav>
        <p className="nv-footer-copy">© {new Date().getFullYear()} Smart Loyalty</p>
      </footer>
    </div>
  );
}
