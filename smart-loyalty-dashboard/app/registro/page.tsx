"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signInWithPopup } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db, provider } from "../firebase/config";
import { useAuth } from "../contexts/AuthContext";
import { LanguageSwitcher, useI18n } from "../i18n/client";
import { BUSINESS_TYPES, type BusinessType } from "../lib/business-types";
import { TRIAL_DAYS } from "../lib/plan";
import BrandLogo from "../components/brandLogo";

export default function RegistroPage() {
  const { user, loading } = useAuth();
  const { m, f, locale } = useI18n();
  const t = m.signup;
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [name, setName] = useState("");
  const [businessType, setBusinessType] = useState<BusinessType | "">("");
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
      setError(m.auth.loginError);
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
          businessType,
          ownerName,
          phone,
          city,
          language: locale,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t.failed);
      router.push("/panel");
    } catch (err) {
      setError(err instanceof Error ? err.message : t.failed);
      setSaving(false);
    }
  };

  const field = "border border-[#cfd8d4] rounded-lg p-2.5 font-normal bg-white";

  return (
    <main className="min-h-screen bg-[#f4f7f5] text-[#111418] px-4 py-10 flex flex-col items-center">
      <Link href="/" className="mb-8" aria-label="Smart Loyalty">
        <BrandLogo size={34} />
      </Link>

      <div className="w-full max-w-md bg-white rounded-2xl border border-[#dfe7e3] p-6 sm:p-8 flex flex-col gap-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#0e7c66]">{f(t.eyebrow, { days: TRIAL_DAYS })}</p>
          <h1 className="text-2xl font-bold mt-1 text-balance">{t.title}</h1>
          <p className="text-sm text-[#4b5560] mt-1">{t.lead}</p>
        </div>

        {loading || (user && !ready) ? (
          <p className="text-sm text-[#4b5560]">{m.common.loading}</p>
        ) : !user ? (
          <button onClick={login} className="w-full border border-[#cfd8d4] rounded-xl py-3 font-semibold hover:bg-[#f4f7f5]">
            {m.common.continueWithGoogle}
          </button>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-3">
            <p className="text-sm text-[#4b5560]">
              {t.account} <b className="text-[#111418]">{user.email}</b>
            </p>
            <label htmlFor="signup-name" className="flex flex-col gap-1 text-sm font-medium">
              {t.name}
              <input
                id="signup-name"
                required
                maxLength={60}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t.namePlaceholder}
                className={field}
              />
            </label>
            <label htmlFor="signup-type" className="flex flex-col gap-1 text-sm font-medium">
              {t.type}
              <select
                id="signup-type"
                required
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value as BusinessType)}
                className={field}
              >
                <option value="" disabled>
                  —
                </option>
                {BUSINESS_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {m.niches.types[type]}
                  </option>
                ))}
              </select>
            </label>
            <label htmlFor="signup-owner" className="flex flex-col gap-1 text-sm font-medium">
              {t.owner}
              <input
                id="signup-owner"
                required
                maxLength={60}
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className={field}
              />
            </label>
            <label htmlFor="signup-phone" className="flex flex-col gap-1 text-sm font-medium">
              {t.phone}
              <input
                id="signup-phone"
                required
                type="tel"
                maxLength={30}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+506 8888 8888"
                className={field}
              />
            </label>
            <label htmlFor="signup-city" className="flex flex-col gap-1 text-sm font-medium">
              {t.city}
              <input
                id="signup-city"
                maxLength={60}
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder={t.cityPlaceholder}
                className={field}
              />
            </label>
            <button
              disabled={saving}
              className="mt-2 w-full bg-[#0e7c66] text-white rounded-xl py-3 font-semibold hover:bg-[#0b6552] disabled:opacity-60"
            >
              {saving ? t.creating : f(t.start, { days: TRIAL_DAYS })}
            </button>
          </form>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      <p className="text-sm text-[#4b5560] mt-6">
        {t.haveAccount}{" "}
        <Link href="/panel" className="text-[#0e7c66] font-semibold">
          {t.login}
        </Link>
      </p>
      <LanguageSwitcher className="mt-4 border-[#cfd8d4] bg-white" />
    </main>
  );
}
