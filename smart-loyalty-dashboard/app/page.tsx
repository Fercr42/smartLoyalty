"use client";
import { useAuth } from "./contexts/AuthContext";
import Auth from "./components/auth";
import BusinessForm from "./components/businessForm";
import CompanyQR from "./components/companyQR";
import { signOut } from "firebase/auth";
import { auth } from "./firebase/config";

export default function Home() {
  const { user, loading } = useAuth();

  const handleLogout = async () => {
    await signOut(auth);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Cargando...</div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">
              Smart Loyalty Dashboard
            </h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">
              Configuración de Empresa
            </h2>
            <BusinessForm />
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">
              Código QR de la Empresa
            </h2>
            <CompanyQR />
          </div>
        </div>
      </main>
    </div>
  );
}
