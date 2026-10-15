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
import ReviewQueue from "../components/reviewQueue";
import StatsPanel from "../components/statsPanel";
import CustomersList from "../components/customersList";
import PlanBanner from "../components/planBanner";
import VerifyEmailBanner from "../components/verifyEmailBanner";
import AutomationsEditor from "../components/automationsEditor";
import BillingPanel from "../components/billingPanel";
import CardDesigner from "../components/cardDesigner";
import CampaignResults from "../components/campaignResults";
import PanelShell from "../components/panelShell";
import { BrandMark } from "../components/brandLogo";
import { display } from "../fonts";
import { auth, db } from "../firebase/config";
import { useI18n } from "../i18n/client";
import { planState, type PlanState } from "../lib/plan";
import { nativePlatform, nativePushReady, registerNativePush } from "../lib/native";
import { useIsNativeApp } from "../lib/use-native";

// Panel del dueño: una sección a la vez, con menú lateral (computadora) o pestañas (celular).
const TABS = ["inicio", "clientes", "mensajes", "resultados", "automatizaciones", "tarjeta", "recompensas", "negocio", "plan"] as const;
type TabId = (typeof TABS)[number];

const tabFromHash = (): TabId => {
  if (typeof window === "undefined") return "inicio";
  const id = window.location.hash.replace("#", "");
  return TABS.find((t) => t === id) ?? "inicio";
};

export default function Panel() {
  const { user, loading } = useAuth();
  const inApp = useIsNativeApp();

  // App del dueño: registrar este celular para recibir avisos (opiniones de clientes).
  useEffect(() => {
    if (!user || !nativePushReady()) return;
    registerNativePush(async (token) => {
      await fetch("/api/owner/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${await user.getIdToken()}` },
        body: JSON.stringify({ token, platform: nativePlatform() }),
      }).catch(() => {});
    }).catch(console.error);
  }, [user]);
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
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  if (loading || (user && !plan)) {
    return (
      <div className="pn-rail flex min-h-screen flex-col items-center justify-center gap-4">
        <span className="sl-pulse grid place-items-center h-14 w-14 rounded-2xl bg-white/95">
          <BrandMark size={30} />
        </span>
        <p className="text-sm text-white/60">{m.common.loading}</p>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  if (plan?.status === "none") {
    return (
      <div className="pn-rail flex min-h-screen items-center justify-center px-4">
        <div className="pn-card p-8 max-w-md w-full text-center flex flex-col gap-4">
          <h1 className={`${display.className} text-3xl font-extrabold text-[#07201b]`}>{m.panel.finishTitle}</h1>
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
    <PanelShell
      tabs={TABS.map((id) => ({ id, label: m.panel.tabs[id].label }))}
      active={tab}
      onSelect={(id) => go(id as TabId)}
      title={current.label}
      description={current.description}
      companyName={companyName}
      email={user.email ?? ""}
      logoutLabel={m.common.logout}
      onLogout={handleLogout}
      sectionsLabel={m.panel.sectionsLabel}
      extra={
        inApp && (
          <a
            href="/app?cambiar=1"
            aria-label={m.appHome.change}
            className="text-sm rounded-lg px-2.5 py-1.5 text-white/80 border border-white/20 hover:bg-white/10"
          >
            ⇄
          </a>
        )
      }
      banners={
        <>
          <VerifyEmailBanner user={user} />
          {plan && <PlanBanner plan={plan} />}
        </>
      }
    >
      {tab === "inicio" && (
        <Card>
          <StatsPanel />
        </Card>
      )}

      {tab === "clientes" && (
        <Card>
          <CustomersList />
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
        <>
          <Card>
            <LoyaltyEditor />
          </Card>
          <Card title={m.reviewQueue.title}>
            <ReviewQueue />
          </Card>
        </>
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
    </PanelShell>
  );
}

function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="pn-card p-5 sm:p-7">
      {title && (
        <h2 className={`${display.className} text-xl font-semibold tracking-tight text-[#07201b] mb-5 flex items-center gap-2.5`}>
          <span aria-hidden className="h-2 w-2 rounded-full bg-[#19c58a]" />
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}
