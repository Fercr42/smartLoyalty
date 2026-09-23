"use client";
import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { auth, provider } from "../firebase/config";
import BrandLogo from "./brandLogo";
import { LanguageSwitcher, useI18n } from "../i18n/client";

const MIN_PASSWORD = 8;

// Acceso del dueño: con Google o con correo y contraseña.
export default function Auth() {
  const { m } = useI18n();
  const t = m.auth;
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Firebase devuelve códigos; cada uno con su explicación.
  const explain = (err: unknown) => {
    const code = (err as { code?: string })?.code ?? "";
    if (code.includes("email-already-in-use")) return t.emailInUse;
    if (code.includes("invalid-email")) return t.invalidEmail;
    if (code.includes("weak-password")) return t.weakPassword;
    if (code.includes("too-many-requests")) return t.tooMany;
    if (code.includes("wrong-password") || code.includes("user-not-found") || code.includes("invalid-credential")) {
      return t.wrongPassword;
    }
    return t.genericError;
  };

  const loginWithGoogle = async () => {
    setError("");
    setNotice("");
    try {
      await signInWithPopup(auth, provider);
    } catch {
      setError(t.loginError);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setNotice("");
    if (!email.trim() || !password) {
      setError(t.fillBoth);
      return;
    }
    if (mode === "signUp" && password.length < MIN_PASSWORD) {
      setError(t.weakPassword);
      return;
    }
    setBusy(true);
    try {
      if (mode === "signUp") {
        const created = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await sendEmailVerification(created.user).catch(() => {});
        setNotice(t.verifySent);
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
    } catch (err) {
      setError(explain(err));
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    setError("");
    setNotice("");
    if (!email.trim()) {
      setError(t.fillBoth);
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setNotice(t.resetSent);
    } catch (err) {
      setError(explain(err));
    }
  };

  const field = "border border-[#cfd8d4] rounded-xl p-3 text-sm text-gray-900 w-full";

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-10 gap-6 bg-[#f4f7f5]">
      <BrandLogo size={40} />
      <div className="bg-white border border-[#dfe7e3] rounded-2xl p-8 max-w-sm w-full text-center flex flex-col gap-4">
        <h1 className="text-xl font-semibold text-gray-900">{t.title}</h1>

        <button
          onClick={loginWithGoogle}
          className="w-full border border-[#cfd8d4] rounded-xl py-3 font-semibold text-gray-900 hover:bg-[#f4f7f5]"
        >
          {m.common.continueWithGoogle}
        </button>

        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="h-px flex-1 bg-[#e6ece9]" />
          {t.or}
          <span className="h-px flex-1 bg-[#e6ece9]" />
        </div>

        <form onSubmit={submit} className="flex flex-col gap-3 text-left">
          <label htmlFor="auth-email" className="flex flex-col gap-1 text-xs text-gray-600">
            {t.email}
            <input
              id="auth-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={field}
            />
          </label>
          <label htmlFor="auth-password" className="flex flex-col gap-1 text-xs text-gray-600">
            {t.password}
            <input
              id="auth-password"
              type="password"
              autoComplete={mode === "signUp" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={mode === "signUp" ? MIN_PASSWORD : undefined}
              className={field}
            />
            {mode === "signUp" && <span className="text-[11px] text-gray-500">{t.passwordHint}</span>}
          </label>
          <button
            disabled={busy}
            className="w-full bg-[#0e7c66] text-white rounded-xl py-3 font-semibold hover:bg-[#0b6553] disabled:opacity-60"
          >
            {busy ? (mode === "signUp" ? t.creating : t.signingIn) : mode === "signUp" ? t.createAccount : t.signIn}
          </button>
        </form>

        <div className="flex flex-col gap-1 text-sm">
          <button
            type="button"
            onClick={() => {
              setMode(mode === "signUp" ? "signIn" : "signUp");
              setError("");
              setNotice("");
            }}
            className="text-[#0e7c66] font-semibold hover:underline"
          >
            {mode === "signUp" ? t.haveAccount : t.noAccount}
          </button>
          {mode === "signIn" && (
            <button type="button" onClick={reset} className="text-gray-600 hover:underline text-xs">
              {t.forgot}
            </button>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {notice && <p className="text-sm text-[#0e7c66]">{notice}</p>}
      </div>
      <LanguageSwitcher className="border-[#cfd8d4] bg-white" />
    </div>
  );
}
