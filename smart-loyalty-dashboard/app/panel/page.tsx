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
import { LanguageSwitcher, useI18n } from "../i18n/client";
import { planState, type PlanState } from "../lib/plan";

// Panel del dueño: una sección a la vez, con menú lateral (computadora) o pestañas (celular).
const TABS = ["inicio", "mensajes", "resultados", "automatizaciones", "tarjeta", "recompensas", "negocio", "plan"] as const;
type TabId = (typeof TABS)[number];

const tabFromHash = (): TabId => {
  if (typeof window === "undefined") return "inicio";
  const id = window.location.hash.replace("#", "");
  return TABS.find((t) => t === id) ?? "inicio";
};

export default function Panel() {
  const { user, loading } = useAuth();
  const { m } = useI18n();
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
        <div className="text-lg">{m.common.loading}</div>
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
          <h1 className="text-2xl font-bold text-gray-900">{m.panel.finishTitle}</h1>
          <p className="text-gray-600">{m.panel.finishLead}</p>
          <Link href="/registro" className="bg-[#0e7c66] text-white rounded-xl py-3 font-semibold">
            {m.panel.finishCta}
          </Link>
          <button onClick={handleLogout} className="text-sm text-gray-500">
            {m.common.logout} ({user.email})
          </button>
        </div>
      </div>
    );
  }

  const current = m.panel.tabs[tab];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-baseline gap-3 min-w-0">
            <BrandLogo size={26} />
            {companyName && <span className="text-sm text-gray-500 truncate hidden sm:inline">· {companyName}</span>}
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSwitcher />
            <span className="text-sm text-gray-600 hidden md:inline truncate max-w-[16rem]">{user.email}</span>
            <button onClick={handleLogout} className="text-sm border rounded-md px-3 py-1.5 text-gray-700 hover:bg-gray-100">
              {m.common.logout}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 grid gap-6 grid-cols-[minmax(0,1fr)] lg:grid-cols-[210px_minmax(0,1fr)]">
        <nav aria-label={m.panel.sectionsLabel} className="lg:sticky lg:top-24 self-start min-w-0">
          <ul className="flex lg:flex-col gap-1 overflow-x-auto pb-1 -mx-1 px-1">
            {TABS.map((id) => (
              <li key={id} className="shrink-0">
                <button
                  onClick={() => go(id)}
                  id={`tab-${id}`}
                  aria-current={tab === id ? "page" : undefined}
                  className={`w-full text-left whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium ${
                    tab === id ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-white hover:shadow-sm"
                  }`}
                >
                  {m.panel.tabs[id].label}
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
              <Card title={m.panel.cardDesign}>
                <CardDesigner />
              </Card>
              <Card title={m.panel.walletData}>
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
              <Card title={m.panel.businessData}>
                <BusinessForm />
              </Card>
              <Card title={m.panel.qrTitle}>
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
