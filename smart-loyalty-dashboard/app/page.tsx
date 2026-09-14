import type { Metadata } from "next";
import Link from "next/link";
import { Bricolage_Grotesque } from "next/font/google";
import { TRIAL_DAYS } from "./lib/plan";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["600", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Smart Loyalty · Clientes que vuelven a tu restaurante",
  description:
    "Notificaciones push, tarjeta de cliente en Google Wallet, sellos, cupones y reseñas para restaurantes. Sin que tus clientes descarguen una app.",
};

const STEPS = [
  {
    title: "Pon tu QR en las mesas",
    text: "Te registras, subes tu logo y descargas tu código. Lo imprimes en la mesa, la caja o el menú.",
  },
  {
    title: "Tus clientes se unen en un toque",
    text: "Escanean, activan notificaciones y guardan su tarjeta de cliente. Sin descargar ninguna app.",
  },
  {
    title: "Tú los haces volver",
    text: "Envías promos, sumas sellos en caja, das cupones y ves en tus estadísticas quién regresa.",
  },
];

const FEATURES = [
  { title: "Notificaciones push", text: "Promos, horarios y eventos directo en la pantalla del celular, con foto y botón." },
  { title: "Tarjeta en Google Wallet", text: "Con tu logo, colores y portada. Se actualiza sola con cada sello." },
  { title: "Sellos y premios", text: "10 visitas = 1 postre. El empleado escanea la tarjeta desde su celular con un PIN." },
  { title: "Cupones de un solo uso", text: "“20% hoy”. Se valida en caja y no se puede usar dos veces." },
  { title: "Envíos programados y por grupo", text: "Programa el viernes 5 pm o escribe solo a clientes frecuentes o inactivos." },
  { title: "Estadísticas", text: "Visitas por día y hora, clientes que regresan, cupones usados y promos abiertas." },
  { title: "Reseñas en Google", text: "Después de la primera visita, tu cliente recibe el enlace para dejarte una reseña." },
  { title: "Exporta tus clientes", text: "Descarga tu lista en Excel cuando quieras. Tus datos son tuyos." },
];

const AUTOMATIONS = [
  { title: "Te falta 1 sello", text: "Avisa cuando alguien está a una visita de su premio." },
  { title: "Feliz cumpleaños", text: "Un regalo automático el día de su cumpleaños." },
  { title: "Te extrañamos", text: "Un cupón para quien lleva semanas sin venir." },
  { title: "Déjanos una reseña", text: "Se pide una vez, unas horas después de la visita." },
];

const FAQ = [
  {
    q: "¿Mis clientes tienen que descargar una app?",
    a: "No. Escanean el QR y todo pasa en el navegador del celular. En Android pueden guardar la tarjeta en Google Wallet.",
  },
  {
    q: "¿Funciona en iPhone?",
    a: "Sí. En iPhone el cliente agrega la página a su pantalla de inicio para recibir notificaciones, y ve su tarjeta de sellos ahí mismo.",
  },
  {
    q: "¿Qué pasa cuando termina la prueba gratis?",
    a: `Durante ${TRIAL_DAYS} días tienes todo. Al terminar, tus clientes conservan su tarjeta y sus sellos; para seguir enviando notificaciones activas tu plan.`,
  },
  {
    q: "¿Necesito tarjeta de crédito para probar?",
    a: "No. Solo tu cuenta de Google y los datos de tu restaurante.",
  },
  {
    q: "¿Mis empleados necesitan cuenta?",
    a: "No. Abren el escáner en su celular con un PIN que tú defines y lo cambias cuando quieras.",
  },
];

export default function Landing() {
  return (
    <div className="bg-white text-[#111418]">
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-[#e6ece9]">
        <nav className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link href="/" className={`${display.className} text-xl font-extrabold tracking-tight`}>
            Smart<span className="text-[#0e7c66]">Loyalty</span>
          </Link>
          <div className="hidden md:flex items-center gap-6 text-sm text-[#4b5560]">
            <a href="#como-funciona" className="hover:text-[#111418]">Cómo funciona</a>
            <a href="#funciones" className="hover:text-[#111418]">Funciones</a>
            <a href="#preguntas" className="hover:text-[#111418]">Preguntas</a>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/panel" className="text-sm font-semibold px-3 py-2 rounded-lg hover:bg-[#f4f7f5]">
              Entrar
            </Link>
            <Link
              href="/registro"
              className="text-sm font-semibold px-4 py-2 rounded-lg bg-[#0e7c66] text-white hover:bg-[#0b6552]"
            >
              Probar gratis
            </Link>
          </div>
        </nav>
      </header>

      <main>
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20 grid gap-12 lg:grid-cols-[1.1fr_0.9fr] items-center">
          <div className="flex flex-col gap-6">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0e7c66]">
              Para restaurantes, cafés y bares
            </p>
            <h1
              className={`${display.className} text-4xl sm:text-6xl font-extrabold leading-[1.02] tracking-tight text-balance`}
            >
              Que tus clientes vuelvan, sin descargar ninguna app.
            </h1>
            <p className="text-lg text-[#4b5560] max-w-[34rem]">
              Un código QR en la mesa. Tus clientes reciben tus promociones en el celular, juntan sellos y guardan su
              tarjeta en Google Wallet. Tú ves quién regresa.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/registro"
                className="px-6 py-3.5 rounded-xl bg-[#0e7c66] text-white font-semibold text-lg hover:bg-[#0b6552]"
              >
                Probar {TRIAL_DAYS} días gratis
              </Link>
              <a href="#como-funciona" className="px-5 py-3.5 rounded-xl font-semibold border border-[#cfd8d4] hover:bg-[#f4f7f5]">
                Ver cómo funciona
              </a>
            </div>
            <p className="text-sm text-[#6b7580]">Sin tarjeta de crédito. Tu QR listo en 10 minutos.</p>
          </div>

          <PhoneMockup />
        </section>

        <section id="como-funciona" className="bg-[#f4f7f5] border-y border-[#e6ece9]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 flex flex-col gap-10">
            <h2 className={`${display.className} text-3xl sm:text-4xl font-extrabold tracking-tight text-balance`}>
              Listo en tres pasos
            </h2>
            <ol className="grid gap-6 md:grid-cols-3">
              {STEPS.map((step, i) => (
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

        <section id="funciones" className="max-w-6xl mx-auto px-4 sm:px-6 py-16 flex flex-col gap-10">
          <div className="flex flex-col gap-3 max-w-2xl">
            <h2 className={`${display.className} text-3xl sm:text-4xl font-extrabold tracking-tight text-balance`}>
              Todo lo que necesitas para llenar mesas otra vez
            </h2>
            <p className="text-[#4b5560]">Una sola herramienta, desde tu celular o computadora.</p>
          </div>
          <div className="grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
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
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#f2b134]">Automatizaciones</p>
              <h2 className={`${display.className} text-3xl sm:text-4xl font-extrabold tracking-tight text-balance`}>
                Trabaja por ti mientras cocinas
              </h2>
              <p className="text-white/80">Actívalas una vez. Cada mensaje llega al cliente correcto en el momento correcto.</p>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {AUTOMATIONS.map((a) => (
                <li key={a.title} className="rounded-xl bg-white/10 border border-white/15 p-4">
                  <p className="font-bold">{a.title}</p>
                  <p className="text-sm text-white/80">{a.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="preguntas" className="max-w-3xl mx-auto px-4 sm:px-6 py-16 flex flex-col gap-8">
          <h2 className={`${display.className} text-3xl sm:text-4xl font-extrabold tracking-tight`}>Preguntas frecuentes</h2>
          <div className="divide-y divide-[#e6ece9] border-y border-[#e6ece9]">
            {FAQ.map((item) => (
              <details key={item.q} className="group py-4">
                <summary className="cursor-pointer list-none flex justify-between gap-4 font-semibold">
                  {item.q}
                  <span className="text-[#0e7c66] group-open:rotate-45 transition-transform" aria-hidden>
                    +
                  </span>
                </summary>
                <p className="mt-2 text-[#4b5560]">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="px-4 sm:px-6 pb-16">
          <div className="max-w-6xl mx-auto rounded-3xl bg-[#111418] text-white px-6 py-12 sm:px-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex flex-col gap-2">
              <h2 className={`${display.className} text-3xl font-extrabold tracking-tight text-balance`}>
                Tu próximo cliente frecuente ya está en una mesa.
              </h2>
              <p className="text-white/70">{TRIAL_DAYS} días gratis. Sin tarjeta de crédito.</p>
            </div>
            <Link
              href="/registro"
              className="shrink-0 px-6 py-3.5 rounded-xl bg-[#f2b134] text-[#111418] font-bold text-lg text-center hover:bg-[#e6a322]"
            >
              Registrar mi restaurante
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#e6ece9]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-wrap justify-between gap-3 text-sm text-[#6b7580]">
          <span>© Smart Loyalty</span>
          <Link href="/panel" className="hover:text-[#111418]">
            Entrar a mi panel
          </Link>
        </div>
      </footer>
    </div>
  );
}

// Ilustración: pantalla bloqueada con una notificación y la tarjeta de sellos (ejemplo).
function PhoneMockup() {
  return (
    <div className="mx-auto w-full max-w-[300px]" aria-hidden>
      <div
        className="rounded-[2.6rem] border-[10px] border-[#111418] shadow-2xl overflow-hidden px-4 pt-8 pb-10 flex flex-col gap-3"
        style={{ background: "linear-gradient(165deg, #127f69 0%, #0a4a3e 100%)" }}
      >
        <p className="text-center text-white/80 text-xs">sábado 14 de septiembre</p>
        <p className={`${display.className} text-center text-white text-6xl font-semibold mb-4`}>7:42</p>

        <div className="rounded-2xl bg-white/95 p-3 flex gap-3 shadow">
          <span className="w-9 h-9 shrink-0 rounded-lg bg-[#f2b134] grid place-items-center text-xs font-extrabold text-[#111418]">
            LE
          </span>
          <div className="min-w-0">
            <p className="text-[11px] text-[#6b7580]">La Esquina · ahora</p>
            <p className="text-sm font-bold leading-tight">2x1 en tacos hoy</p>
            <p className="text-xs text-[#4b5560]">De 5 a 8 pm. Muestra tu tarjeta en caja.</p>
          </div>
        </div>

        <div className="rounded-2xl bg-[#111418] text-white p-4 flex flex-col gap-3 shadow">
          <div className="flex justify-between items-baseline">
            <p className="text-sm font-bold">La Esquina</p>
            <p className="text-[11px] text-white/60">Cliente frecuente</p>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: 10 }, (_, i) => (
              <span
                key={i}
                className={`aspect-square rounded-full border-2 ${
                  i < 9 ? "bg-[#f2b134] border-[#f2b134]" : "border-dashed border-white/40"
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-white/80">Te falta 1 sello para tu postre gratis</p>
        </div>
      </div>
    </div>
  );
}
