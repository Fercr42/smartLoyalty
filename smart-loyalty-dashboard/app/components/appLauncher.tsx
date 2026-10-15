"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BrandLogo from "./brandLogo";
import { LanguageSwitcher, useI18n } from "../i18n/client";
import { companyIdFromQr, haptic, hasNativeScanner, nativeScan } from "../lib/native";

// Inicio de la app: el dueño va a su panel; el empleado elige el negocio (escaneando su QR) y va al escáner.
// La elección se recuerda en este celular; /app?cambiar=1 la borra.
export const ROLE_KEY = "app-role";
type Saved = { role: "owner" } | { role: "staff"; companyId: string };

const readRole = (): Saved | null => {
  try {
    return JSON.parse(localStorage.getItem(ROLE_KEY) ?? "null");
  } catch {
    return null;
  }
};
const saveRole = (value: Saved | null) => {
  try {
    if (value) localStorage.setItem(ROLE_KEY, JSON.stringify(value));
    else localStorage.removeItem(ROLE_KEY);
  } catch {}
};
const target = (saved: Saved) => (saved.role === "owner" ? "/panel" : `/scan/${saved.companyId}`);

export default function AppLauncher() {
  const router = useRouter();
  const { m } = useI18n();
  const t = m.appHome;
  const [ready, setReady] = useState(false);
  const [staffStep, setStaffStep] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("cambiar")) {
      saveRole(null);
    } else {
      const saved = readRole();
      if (saved) {
        router.replace(target(saved));
        return;
      }
    }
    // localStorage solo existe en el navegador: decidir después de montar.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReady(true);
  }, [router]);

  const go = (saved: Saved) => {
    saveRole(saved);
    haptic("LIGHT");
    router.push(target(saved));
  };

  const applyCode = (text: string) => {
    const companyId = companyIdFromQr(text);
    if (!companyId) {
      setError(t.invalidCode);
      return;
    }
    go({ role: "staff", companyId });
  };

  const scan = async () => {
    setError("");
    try {
      const text = await nativeScan();
      if (text) applyCode(text);
    } catch {
      setError(t.scanFailed);
    }
  };

  if (!ready) return <main className="min-h-screen bg-[#f4f7f5]" />;

  const card = "w-full text-left rounded-2xl border bg-white p-5 flex flex-col gap-1 hover:border-[#0e7c66] active:scale-[0.99] transition";

  return (
    <main className="min-h-screen bg-[#f4f7f5] flex flex-col items-center px-4 py-10 gap-6">
      <BrandLogo size={30} />
      <div className="w-full max-w-sm flex flex-col gap-4">
        {!staffStep ? (
          <>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
              <p className="text-sm text-gray-600 mt-1">{t.lead}</p>
            </div>
            <button onClick={() => go({ role: "owner" })} className={card}>
              <span className="text-lg font-bold text-gray-900">{t.owner}</span>
              <span className="text-sm text-gray-600">{t.ownerHint}</span>
            </button>
            <button onClick={() => setStaffStep(true)} className={card}>
              <span className="text-lg font-bold text-gray-900">{t.staff}</span>
              <span className="text-sm text-gray-600">{t.staffHint}</span>
            </button>
            <p className="text-xs text-gray-500 text-center">{t.noAccount}</p>
          </>
        ) : (
          <>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900">{t.staff}</h1>
              <p className="text-sm text-gray-600 mt-1">{t.scanBusinessHint}</p>
            </div>
            {hasNativeScanner() && (
              <button onClick={scan} className="w-full bg-[#0e7c66] text-white rounded-xl py-3 font-semibold">
                {t.scanBusiness}
              </button>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setError("");
                applyCode(code);
              }}
              className="flex flex-col gap-2"
            >
              <label htmlFor="business-code" className="text-xs text-gray-600">
                {t.businessCode}
              </label>
              <input
                id="business-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                autoCapitalize="none"
                autoCorrect="off"
                className="border rounded-xl p-3 bg-white"
              />
              <button disabled={!code.trim()} className="w-full border rounded-xl py-3 font-semibold bg-white disabled:opacity-50">
                {t.continue}
              </button>
            </form>
            <button onClick={() => setStaffStep(false)} className="text-sm text-gray-600">
              {t.back}
            </button>
          </>
        )}
        {error && <p className="text-sm text-red-600 text-center">{error}</p>}
      </div>
      <LanguageSwitcher className="border-[#cfd8d4] bg-white" />
    </main>
  );
}
