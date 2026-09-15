"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "../contexts/AuthContext";
import Auth from "../components/auth";
import BusinessForm from "../components/businessForm";
import CompanyQR from "../components/companyQR";
import NotificationComposer from "../components/notificationComposer";
import WalletCardEditor from "../components/walletCardEditor";
import LoyaltyEditor from "../components/loyaltyEditor";
import StatsPanel from "../components/statsPanel";
import PlanBanner from "../components/planBanner";
import AutomationsEditor from "../components/automationsEditor";
import BillingPanel from "../components/billingPanel";
import CardDesigner from "../components/cardDesigner";
import CampaignResults from "../components/campaignResults";
import BrandLogo from "../components/brandLogo";
import { auth, db } from "../firebase/config";
import { planState, type PlanState } from "../lib/plan";

// Panel del dueño: una sección a la vez, con menú lateral (computadora) o pestañas (celular).
const TABS = [
  { id: "inicio", label: "Inicio", description: "Cómo le va a tu restaurante en los últimos 30 días." },
  { id: "mensajes", label: "Mensajes", description: "Envía o programa promociones, horarios y eventos." },
  { id: "resultados", label: "Resultados", description: "Qué pasó después de cada mensaje: aperturas, cupones y clientes que volvieron." },
  { id: "automatizaciones", label: "Automatizaciones", description: "Mensajes que se envían solos en el momento justo." },
  { id: "tarjeta", label: "Tarjeta", description: "El diseño de tu tarjeta y lo que muestra en Google Wallet." },
  { id: "recompensas", label: "Recompensas", description: "Premios por sellos, escáner de empleados y reseñas." },
  { id: "negocio", label: "Mi negocio", description: "Nombre, logo, colores y el código QR para tus mesas." },
  { id: "plan", label: "Plan", description: "Tu suscripción a Smart Loyalty." },
] as const;
type TabId = (typeof TABS)[number]["id"];

const tabFromHash = (): TabId => {
  if (typeof window === "undefined") return "inicio";
  const id = window.location.hash.replace("#", "");
  return (TABS.find((t) => t.id === id)?.id ?? "inicio") as TabId;
};

export default function Panel() {
  const { user, loading } = useAuth();
  const [plan, setPlan] = useState<PlanState | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [tab, setTab] = useState<TabId>(tabFromHash);

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, "companies", user.uid))
      .then((snap) => {
        setPlan(planState(snap.data()?.plan));
        setCompanyName(snap.data()?.name ?? "");
      })
      .catch(() => setPlan(planState(null)));
  }, [user]);

  // Enlaces como "Activar plan" (#plan) también cambian de sección.
  useEffect(() => {
    const onHash = () => setTab(tabFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const go = (id: TabId) => {
    setTab(id);
    history.replaceState(null, "", `#${id}`);
    window.scrollTo({ top: 0 });
    // En celular el menú se desliza de lado: deja visible la pestaña elegida.
    document.getElementById(`tab-${id}`)?.scrollIntoView({ inline: "center", block: "nearest" });
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  if (loading || (user && !plan)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Cargando...</div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  if (plan?.status === "none") {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 bg-gray-50">
        <div className="bg-white rounded-2xl border p-8 max-w-md w-full text-center flex flex-col gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Termina tu registro</h1>
          <p className="text-gray-600">Completa los datos de tu restaurante para empezar tu prueba gratis.</p>
          <Link href="/registro" className="bg-[#0e7c66] text-white rounded-xl py-3 font-semibold">
            Completar registro
          </Link>
          <button onClick={handleLogout} className="text-sm text-gray-500">
            Cerrar sesión ({user.email})
          </button>
        </div>
      </div>
    );
  }

  const current = TABS.find((t) => t.id === tab)!;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-baseline gap-3 min-w-0">
            <BrandLogo size={26} />
            {companyName && <span className="text-sm text-gray-500 truncate hidden sm:inline">· {companyName}</span>}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 hidden md:inline truncate max-w-[16rem]">{user.email}</span>
            <button onClick={handleLogout} className="text-sm border rounded-md px-3 py-1.5 text-gray-700 hover:bg-gray-100">
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 grid gap-6 grid-cols-[minmax(0,1fr)] lg:grid-cols-[210px_minmax(0,1fr)]">
        <nav aria-label="Secciones del panel" className="lg:sticky lg:top-24 self-start min-w-0">
          <ul className="flex lg:flex-col gap-1 overflow-x-auto pb-1 -mx-1 px-1">
            {TABS.map((t) => (
              <li key={t.id} className="shrink-0">
                <button
                  onClick={() => go(t.id)}
                  id={`tab-${t.id}`}
                  aria-current={tab === t.id ? "page" : undefined}
                  className={`w-full text-left whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium ${
                    tab === t.id ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-white hover:shadow-sm"
                  }`}
                >
                  {t.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <main className="flex flex-col gap-6 min-w-0">
          {plan && <PlanBanner plan={plan} />}

          <div>
            <h1 className="text-2xl font-bold text-gray-900">{current.label}</h1>
            <p className="text-sm text-gray-600">{current.description}</p>
          </div>

          {tab === "inicio" && (
            <Card>
              <StatsPanel />
            </Card>
          )}

          {tab === "mensajes" && (
            <Card>
              <NotificationComposer />
            </Card>
          )}

          {tab === "resultados" && (
            <Card>
              <CampaignResults />
            </Card>
          )}

          {tab === "automatizaciones" && (
            <Card>
              <AutomationsEditor />
            </Card>
          )}

          {tab === "tarjeta" && (
            <>
              <Card title="Diseño de la tarjeta">
                <CardDesigner />
              </Card>
              <Card title="Datos y botones en Google Wallet">
                <WalletCardEditor />
              </Card>
            </>
          )}

          {tab === "recompensas" && (
            <Card>
              <LoyaltyEditor />
            </Card>
          )}

          {tab === "negocio" && (
            <div className="grid gap-6 lg:grid-cols-2">
              <Card title="Datos del restaurante">
                <BusinessForm />
              </Card>
              <Card title="Código QR para tus mesas">
                <CompanyQR />
              </Card>
            </div>
          )}

          {tab === "plan" && plan && (
            <Card>
              <BillingPanel plan={plan} onPlanChange={setPlan} />
            </Card>
          )}
        </main>
      </div>
    </div>
  );
}

function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-xl border p-5 sm:p-6">
      {title && <h2 className="text-lg font-semibold text-gray-900 mb-4">{title}</h2>}
      {children}
    </section>
  );
}
