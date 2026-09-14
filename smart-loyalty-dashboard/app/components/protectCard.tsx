"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { isSignInWithEmailLink, sendSignInLinkToEmail, signInWithEmailLink } from "firebase/auth";
import { auth } from "../firebase/config";
import { getMemberId, setMemberId } from "../lib/member-id";

// "Protege tus sellos": liga la tarjeta del cliente a su correo para recuperarla en cualquier celular.
// Se hace una vez por celular; después el navegador queda recordado.

const EMAIL_KEY = "sl-email-for-signin";
const SHARE_KEY = "sl-share-email";
type Status = "idle" | "sending" | "sent" | "confirm" | "linking" | "code";

const readStorage = (key: string) => {
  try {
    return localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
};
const writeStorage = (key: string, value: string | null) => {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {}
};
const maskEmail = (email: string) => email.replace(/^(.{2}).*(@.*)$/, "$1•••$2");

export default function ProtectCard({
  companyId,
  companyName,
  linked,
  email,
  onLinked,
}: {
  companyId: string;
  companyName: string;
  linked: boolean;
  email: string | null;
  onLinked: () => void;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [emailInput, setEmailInput] = useState("");
  const [share, setShare] = useState(true);
  const [codeInput, setCodeInput] = useState("");
  const [pairCode, setPairCode] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const autoLinked = useRef(false);

  const link = useCallback(
    async (shareEmail: boolean) => {
      const user = auth.currentUser;
      if (!user) return false;
      const idToken = await user.getIdToken();
      const post = (memberId: string) =>
        fetch("/api/loyalty/link", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
          body: JSON.stringify({ companyId, memberId, shareEmail }),
        });
      let res = await post(getMemberId(companyId));
      if (res.status === 409) {
        // La tarjeta de este navegador era de otra persona: empezar una nueva ligada a este correo.
        const fresh = crypto.randomUUID();
        setMemberId(companyId, fresh);
        res = await post(fresh);
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo proteger la tarjeta");
      setMemberId(companyId, data.memberId);
      onLinked();
      return true;
    },
    [companyId, onLinked]
  );

  const createPairCode = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return;
    const res = await fetch("/api/loyalty/pair", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${await user.getIdToken()}` },
      body: JSON.stringify({ action: "create" }),
    });
    const data = await res.json();
    if (res.ok) setPairCode(data.code);
  }, []);

  const completeSignIn = useCallback(
    async (address: string) => {
      setStatus("linking");
      setMessage(null);
      try {
        await signInWithEmailLink(auth, address, window.location.href);
        writeStorage(EMAIL_KEY, null);
        window.history.replaceState(null, "", window.location.pathname);
        await link(readStorage(SHARE_KEY) === "1");
        setMessage({ ok: true, text: "¡Listo! Tu tarjeta quedó protegida con tu correo." });
        await createPairCode();
        setStatus("idle");
      } catch (err) {
        console.error(err);
        setMessage({ ok: false, text: "El enlace no es válido o ya venció. Pide uno nuevo." });
        setStatus("idle");
      }
    },
    [link, createPairCode]
  );

  // Llegó desde el enlace del correo.
  useEffect(() => {
    if (!isSignInWithEmailLink(auth, window.location.href)) return;
    const stored = readStorage(EMAIL_KEY);
    Promise.resolve().then(() => {
      if (stored) completeSignIn(stored).catch(console.error);
      else setStatus("confirm"); // lo abrió en otro navegador: confirmar correo
    });
  }, [completeSignIn]);

  // Ya entró con su correo en este navegador (ej. en otro restaurante): ligar sola esta tarjeta.
  useEffect(() => {
    if (linked || autoLinked.current || isSignInWithEmailLink(auth, window.location.href)) return;
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user?.email || !user.emailVerified || autoLinked.current) return;
      autoLinked.current = true;
      link(false).catch(console.error);
    });
    return unsubscribe;
  }, [linked, link]);

  const sendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    const address = emailInput.trim();
    if (!/^\S+@\S+\.\S+$/.test(address)) {
      setMessage({ ok: false, text: "Escribe un correo válido." });
      return;
    }
    setStatus("sending");
    setMessage(null);
    try {
      await sendSignInLinkToEmail(auth, address, {
        url: `${window.location.origin}/join/${companyId}`,
        handleCodeInApp: true,
      });
      writeStorage(EMAIL_KEY, address);
      writeStorage(SHARE_KEY, share ? "1" : "0");
      setStatus("sent");
    } catch (err) {
      console.error(err);
      setMessage({ ok: false, text: "No se pudo enviar el enlace. Revisa el correo e inténtalo de nuevo." });
      setStatus("idle");
    }
  };

  const redeemCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    const res = await fetch("/api/loyalty/pair", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "redeem", code: codeInput, companyId, memberId: getMemberId(companyId), shareEmail: share }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage({ ok: false, text: data.error ?? "No se pudo usar el código" });
      return;
    }
    setMemberId(companyId, data.memberId);
    setMessage({ ok: true, text: "¡Listo! Esta app ya tiene tu tarjeta." });
    setStatus("idle");
    onLinked();
  };

  if (linked) {
    return (
      <div className="w-full text-left rounded-lg bg-gray-50 border px-3 py-2 flex flex-col gap-1">
        <p className="text-xs text-gray-600">
          Tarjeta protegida{email ? ` con ${maskEmail(email)}` : " con tu correo"}. Si cambias de celular, la recuperas con tu correo.
        </p>
        {pairCode ? (
          <p className="text-sm text-gray-900">
            ¿Usas la app del ícono en iPhone u otro navegador? Escribe ahí este código:{" "}
            <b className="font-mono tracking-widest">{pairCode}</b> <span className="text-xs text-gray-500">(vence en 10 min)</span>
          </p>
        ) : (
          auth.currentUser?.emailVerified && (
            <button onClick={() => createPairCode().catch(console.error)} className="self-start text-xs text-blue-700">
              Obtener código para otra app o navegador
            </button>
          )
        )}
        {message && <p className={`text-xs ${message.ok ? "text-green-700" : "text-red-600"}`}>{message.text}</p>}
      </div>
    );
  }

  return (
    <div className="w-full text-left border rounded-lg p-3 flex flex-col gap-2">
      <p className="text-sm font-semibold text-gray-900">Protege tus sellos</p>
      <p className="text-xs text-gray-600">Si cambias de celular o borras los datos, recuperas tu tarjeta con tu correo. Se hace una sola vez.</p>

      {status === "sent" ? (
        <p className="text-sm text-green-800 bg-green-50 rounded p-2">
          Te enviamos un enlace a <b>{emailInput}</b>. Ábrelo en este celular. Si usas la app del ícono en iPhone, el enlace se
          abre en Safari: ahí verás un código para escribir en la app.
        </p>
      ) : status === "confirm" ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            completeSignIn(emailInput.trim()).catch(console.error);
          }}
          className="flex flex-col gap-2"
        >
          <p className="text-xs text-gray-700">Confirma el correo al que te llegó el enlace:</p>
          <div className="flex gap-2">
            <input id="protect-confirm-email" type="email" required value={emailInput} onChange={(e) => setEmailInput(e.target.value)} placeholder="tu@correo.com" className="border rounded p-2 text-sm flex-1 min-w-0" />
            <button className="px-3 rounded bg-gray-900 text-white text-sm">Confirmar</button>
          </div>
        </form>
      ) : status === "code" ? (
        <form onSubmit={redeemCode} className="flex gap-2">
          <input id="protect-code" value={codeInput} onChange={(e) => setCodeInput(e.target.value.toUpperCase())} maxLength={9} placeholder="Código de 8 caracteres" className="border rounded p-2 text-sm flex-1 min-w-0 font-mono tracking-widest" />
          <button className="px-3 rounded bg-gray-900 text-white text-sm">Usar</button>
        </form>
      ) : (
        <form onSubmit={sendLink} className="flex flex-col gap-2">
          <div className="flex gap-2">
            <input id="protect-email" type="email" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} placeholder="tu@correo.com" className="border rounded p-2 text-sm flex-1 min-w-0" />
            <button disabled={status === "sending" || status === "linking"} className="px-3 rounded bg-gray-900 text-white text-sm disabled:opacity-50">
              {status === "sending" ? "Enviando..." : status === "linking" ? "Protegiendo..." : "Enviar enlace"}
            </button>
          </div>
          <label htmlFor="protect-share" className="flex items-start gap-2 text-xs text-gray-600">
            <input id="protect-share" type="checkbox" checked={share} onChange={(e) => setShare(e.target.checked)} className="mt-0.5" />
            Compartir mi correo con {companyName} para recibir novedades
          </label>
        </form>
      )}

      {status !== "code" && status !== "confirm" && (
        <button onClick={() => setStatus("code")} className="self-start text-xs text-blue-700">
          Tengo un código de 8 caracteres
        </button>
      )}
      {message && <p className={`text-xs ${message.ok ? "text-green-700" : "text-red-600"}`}>{message.text}</p>}
    </div>
  );
}
