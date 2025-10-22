"use client";
import { auth, provider } from "../firebase/config";
import { signInWithPopup } from "firebase/auth";

export default function Auth() {
  const loginWithGoogle = async () => {
    await signInWithPopup(auth, provider);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-2xl font-semibold mb-4">
        Smart Loyalty QR Dashboard
      </h1>
      <button
        onClick={loginWithGoogle}
        className="bg-blue-600 text-white px-4 py-2 rounded-md"
      >
        Iniciar sesión con Google
      </button>
    </div>
  );
}
