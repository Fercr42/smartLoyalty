"use client";
import { useCallback, useEffect, useState } from "react";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { getMessaging, getToken, isSupported, onMessage } from "firebase/messaging";
import { app, db } from "../firebase/config";

type Company = { name: string; description?: string; logoUrl?: string };
type Status =
  | "loading"
  | "notfound"
  | "ready"
  | "ios-install"
  | "unsupported"
  | "denied"
  | "subscribing"
  | "subscribed"
  | "error";

const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent);
const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

export default function JoinClient({ companyId }: { companyId: string }) {
  const [company, setCompany] = useState<Company | null>(null);
  const [status, setStatus] = useState<Status>("loading");

  const subscribe = useCallback(
    async (companyName: string) => {
      setStatus("subscribing");
      try {
        if (Notification.permission !== "granted") {
          const permission = await Notification.requestPermission();
          if (permission !== "granted") {
            setStatus(permission === "denied" ? "denied" : "ready");
            return;
          }
        }
        await navigator.serviceWorker.register("/firebase-messaging-sw.js");
        const registration = await navigator.serviceWorker.ready;
        const messaging = getMessaging(app);
        const token = await getToken(messaging, {
          vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
          serviceWorkerRegistration: registration,
        });
        await setDoc(doc(db, "companies", companyId, "subscribers", token), {
          token,
          channel: "webpush",
          platform: isIOS() ? "ios" : /Android/i.test(navigator.userAgent) ? "android" : "web",
          createdAt: serverTimestamp(),
        });
        // Con la página abierta el SW no muestra la notificación; la mostramos aquí.
        onMessage(messaging, (payload) => {
          registration.showNotification(payload.notification?.title ?? companyName, {
            body: payload.notification?.body,
            icon: payload.notification?.icon,
          });
        });
        setStatus("subscribed");
      } catch (e) {
        console.error(e);
        setStatus("error");
      }
    },
    [companyId]
  );

  useEffect(() => {
    (async () => {
      const snap = await getDoc(doc(db, "companies", companyId));
      if (!snap.exists()) return setStatus("notfound");
      const data = snap.data() as Company;
      setCompany(data);
      if (isIOS() && !isStandalone()) return setStatus("ios-install");
      if (!(await isSupported())) return setStatus("unsupported");
      if (Notification.permission === "denied") return setStatus("denied");
      // Ya dio permiso antes: refrescar token sin preguntar.
      if (Notification.permission === "granted") return subscribe(data.name);
      setStatus("ready");
    })().catch((e) => {
      console.error(e);
      setStatus("error");
    });
  }, [companyId, subscribe]);

  if (status === "loading") {
    return <Shell><p className="text-gray-500">Cargando...</p></Shell>;
  }
  if (status === "notfound" || !company) {
    return <Shell><p className="text-gray-700">Este código QR no es válido.</p></Shell>;
  }

  return (
    <Shell>
      {company.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={company.logoUrl} alt="" className="w-24 h-24 rounded-2xl object-cover mx-auto" />
      ) : null}
      <h1 className="text-2xl font-bold text-gray-900 text-balance">{company.name}</h1>
      {company.description ? <p className="text-gray-600">{company.description}</p> : null}

      <div className="mt-2 w-full">
        {(status === "ready" || status === "error") && (
          <>
            <p className="text-gray-700 mb-4">
              Recibe promociones, horarios y eventos directo en tu celular.
            </p>
            <button
              onClick={() => subscribe(company.name)}
              className="w-full bg-gray-900 text-white py-3 rounded-xl font-semibold hover:bg-gray-800"
            >
              Activar notificaciones
            </button>
            {status === "error" && (
              <p className="text-red-600 text-sm mt-3">
                No se pudo activar. Revisa tu conexión e inténtalo de nuevo.
              </p>
            )}
          </>
        )}

        {status === "subscribing" && <p className="text-gray-600">Activando...</p>}

        {status === "subscribed" && (
          <div className="bg-green-50 text-green-800 rounded-xl p-4">
            <p className="font-semibold">¡Listo! Ya estás suscrito.</p>
            <p className="text-sm">Te avisaremos de promociones y novedades.</p>
          </div>
        )}

        {status === "ios-install" && (
          <div className="bg-gray-100 rounded-xl p-4 text-left text-gray-800">
            <p className="font-semibold mb-2">En iPhone, un paso más:</p>
            <ol className="list-decimal pl-5 space-y-1 text-sm">
              <li>Toca el botón <b>Compartir</b> de Safari (cuadro con flecha).</li>
              <li>Elige <b>Agregar a pantalla de inicio</b>.</li>
              <li>Abre el ícono nuevo y toca <b>Activar notificaciones</b>.</li>
            </ol>
            <p className="text-xs text-gray-500 mt-2">Requiere iOS 16.4 o más reciente.</p>
          </div>
        )}

        {status === "denied" && (
          <p className="text-gray-700">
            Bloqueaste las notificaciones. Actívalas en los ajustes del navegador para este sitio y recarga la página.
          </p>
        )}

        {status === "unsupported" && (
          <p className="text-gray-700">
            Este navegador no admite notificaciones. Abre este enlace en Chrome (Android) o Safari (iPhone).
          </p>
        )}
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
      <div className="bg-white shadow-sm border rounded-2xl p-8 max-w-sm w-full text-center flex flex-col items-center gap-3">
        {children}
      </div>
    </main>
  );
}
