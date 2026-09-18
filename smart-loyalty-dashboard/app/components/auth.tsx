"use client";
import { useState } from "react";
import { auth, provider } from "../firebase/config";
import { signInWithPopup } from "firebase/auth";
import BrandLogo from "./brandLogo";
import { LanguageSwitcher, useI18n } from "../i18n/client";

export default function Auth() {
  const { m } = useI18n();
  const [error, setError] = useState("");
  const loginWithGoogle = async () => {
    setError("");
    try {
      await signInWithPopup(auth, provider);
    } catch {
      setError(m.auth.loginError);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 gap-6 bg-[#f4f7f5]">
      <BrandLogo size={40} />
      <div className="bg-white border border-[#dfe7e3] rounded-2xl p-8 max-w-sm w-full text-center flex flex-col gap-4">
        <h1 className="text-xl font-semibold text-gray-900">{m.auth.title}</h1>
        <button
          onClick={loginWithGoogle}
          className="w-full border border-[#cfd8d4] rounded-xl py-3 font-semibold text-gray-900 hover:bg-[#f4f7f5]"
        >
          {m.common.continueWithGoogle}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
      <LanguageSwitcher className="border-[#cfd8d4] bg-white" />
    </div>
  );
}
