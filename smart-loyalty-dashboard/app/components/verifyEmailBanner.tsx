"use client";
import { useState } from "react";
import { sendEmailVerification, type User } from "firebase/auth";
import { useI18n } from "../i18n/client";

// Aviso para quien creó su cuenta con correo y todavía no lo confirmó.
export default function VerifyEmailBanner({ user }: { user: User }) {
  const { m, f } = useI18n();
  const t = m.auth;
  const [sent, setSent] = useState(false);
  const withPassword = user.providerData.some((p) => p.providerId === "password");

  if (!withPassword || user.emailVerified) return null;

  return (
    <div className="border border-amber-300 bg-amber-50 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="font-semibold text-amber-900">{t.verifyTitle}</p>
        <p className="text-sm text-amber-900/80">{f(t.verifyText, { email: user.email ?? "" })}</p>
      </div>
      {sent ? (
        <span className="text-sm text-amber-900">{t.resent}</span>
      ) : (
        <button
          type="button"
          onClick={() => sendEmailVerification(user).then(() => setSent(true)).catch(() => setSent(true))}
          className="text-sm font-semibold border border-amber-400 rounded-lg px-3 py-2 text-amber-900 hover:bg-amber-100"
        >
          {t.resend}
        </button>
      )}
    </div>
  );
}
