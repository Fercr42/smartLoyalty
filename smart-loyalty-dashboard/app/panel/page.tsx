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
import { auth, db } from "../firebase/config";
import { planState, type PlanState } from "../lib/plan";

export default function Panel() {
  const { user, loading } = useAuth();
  const [plan, setPlan] = useState<PlanState | null>(null);

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, "companies", user.uid))
      .then((snap) => setPlan(planState(snap.data()?.plan)))
      .catch(() => setPlan(planState(null)));
  }, [user]);

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
          <p className="text-gray-600">
            Completa los datos de tu restaurante para empezar tu prueba gratis.
          </p>
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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4 gap-4">
            <h1 className="text-2xl font-bold text-gray-900">
              Smart Loyalty
            </h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600 hidden sm:inline">
                Hola, {user.displayName || user.email}
              </span>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-md text-sm hover:bg-red-700"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8">
        {plan && <PlanBanner plan={plan} />}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
            <h2 className="text-xl font-semibold mb-4">Estadísticas</h2>
            <StatsPanel />
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Configuración de Empresa</h2>
            <BusinessForm />
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Código QR de la Empresa</h2>
            <CompanyQR />
          </div>

          <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
            <h2 className="text-xl font-semibold mb-4">Enviar notificación</h2>
            <NotificationComposer />
          </div>

          <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
            <h2 className="text-xl font-semibold mb-4">Tarjeta de Google Wallet</h2>
            <WalletCardEditor />
          </div>

          <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
            <h2 className="text-xl font-semibold mb-4">Recompensas</h2>
            <LoyaltyEditor />
          </div>

          <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
            <h2 className="text-xl font-semibold mb-4">Automatizaciones</h2>
            <AutomationsEditor />
          </div>
        </div>
      </main>
    </div>
  );
}
