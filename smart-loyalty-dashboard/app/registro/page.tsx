"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signInWithPopup } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db, provider } from "../firebase/config";
import { useAuth } from "../contexts/AuthContext";
import { TRIAL_DAYS } from "../lib/plan";

export default function RegistroPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [name, setName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Si ya está registrado, directo al panel.
  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, "companies", user.uid))
      .then((snap) => {
        if (snap.data()?.plan?.status) {
          router.replace("/panel");
          return;
        }
        if (snap.data()?.name) setName(snap.data()!.name);
        if (user.displayName) setOwnerName((v) => v || user.displayName!);
        setReady(true);
      })
      .catch(() => setReady(true));
  }, [user, router]);

  const login = async () => {
    setError("");
    try {
      await signInWithPopup(auth, provider);
    } catch {
      setError("No se pudo iniciar sesión con Google. Inténtalo de nuevo.");
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${await user.getIdToken()}` },
        body: JSON.stringify({
          name,
          ownerName,
          phone,
          city,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo completar el registro");
      router.push("/panel");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo completar el registro");
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f4f7f5] text-[#111418] px-4 py-10 flex flex-col items-center">
      <Link href="/" className="font-bold text-lg mb-8">
        Smart<span className="text-[#0e7c66]">Loyalty</span>
      </Link>

      <div className="w-full max-w-md bg-white rounded-2xl border border-[#dfe7e3] p-6 sm:p-8 flex flex-col gap-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#0e7c66]">
            {TRIAL_DAYS} días gratis · sin tarjeta
          </p>
          <h1 className="text-2xl font-bold mt-1 text-balance">Registra tu restaurante</h1>
          <p className="text-sm text-[#4b5560] mt-1">
            En 10 minutos tienes tu QR listo para poner en las mesas.
          </p>
        </div>

        {loading || (user && !ready) ? (
          <p className="text-sm text-[#4b5560]">Cargando...</p>
        ) : !user ? (
          <button
            onClick={login}
            className="w-full border border-[#cfd8d4] rounded-xl py-3 font-semibold hover:bg-[#f4f7f5]"
          >
            Continuar con Google
          </button>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-3">
            <p className="text-sm text-[#4b5560]">
              Cuenta: <b className="text-[#111418]">{user.email}</b>
            </p>
            <label htmlFor="signup-name" className="flex flex-col gap-1 text-sm font-medium">
              Nombre del restaurante
              <input
                id="signup-name"
                required
                maxLength={60}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="La Esquina Taquería"
                className="border border-[#cfd8d4] rounded-lg p-2.5 font-normal"
              />
            </label>
            <label htmlFor="signup-owner" className="flex flex-col gap-1 text-sm font-medium">
              Tu nombre
              <input
                id="signup-owner"
                required
                maxLength={60}
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="border border-[#cfd8d4] rounded-lg p-2.5 font-normal"
              />
            </label>
            <label htmlFor="signup-phone" className="flex flex-col gap-1 text-sm font-medium">
              WhatsApp
              <input
                id="signup-phone"
                required
                type="tel"
                maxLength={30}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+506 8888 8888"
                className="border border-[#cfd8d4] rounded-lg p-2.5 font-normal"
              />
            </label>
            <label htmlFor="signup-city" className="flex flex-col gap-1 text-sm font-medium">
              Ciudad y país
              <input
                id="signup-city"
                maxLength={60}
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="San José, Costa Rica"
                className="border border-[#cfd8d4] rounded-lg p-2.5 font-normal"
              />
            </label>
            <button
              disabled={saving}
              className="mt-2 w-full bg-[#0e7c66] text-white rounded-xl py-3 font-semibold hover:bg-[#0b6552] disabled:opacity-60"
            >
              {saving ? "Creando tu cuenta..." : `Empezar prueba de ${TRIAL_DAYS} días`}
            </button>
          </form>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      <p className="text-sm text-[#4b5560] mt-6">
        ¿Ya tienes cuenta?{" "}
        <Link href="/panel" className="text-[#0e7c66] font-semibold">
          Entrar
        </Link>
      </p>
    </main>
  );
}
