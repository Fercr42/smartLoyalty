"use client";
import { QRCodeCanvas } from "qrcode.react";
import { useAuth } from "../contexts/AuthContext";
import { publicOrigin } from "../lib/origin";

export default function CompanyQR() {
  const { user } = useAuth();
  if (!user || typeof window === "undefined") return null;

  const joinUrl = `${publicOrigin(window.location.origin)}/join/${user.uid}`;

  const download = () => {
    const canvas = document.getElementById("company-qr") as HTMLCanvasElement | null;
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = "qr-notificaciones.png";
    a.click();
  };

  return (
    <div className="text-center mt-6 flex flex-col items-center gap-2">
      <QRCodeCanvas id="company-qr" value={joinUrl} size={220} marginSize={2} />
      <p className="text-sm text-gray-500">
        Tus clientes lo escanean para recibir notificaciones
      </p>
      <a href={joinUrl} target="_blank" className="text-xs text-blue-600 break-all">
        {joinUrl}
      </a>
      <button onClick={download} className="border px-3 py-1.5 rounded text-sm hover:bg-gray-100">
        Descargar PNG
      </button>
    </div>
  );
}
