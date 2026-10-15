"use client";
import { QRCodeSVG } from "qrcode.react";

// QR real del paso 1 (lleva a smartloyalty.app), con una línea de escaneo que lo recorre.
export default function StepQr() {
  return (
    <div className="nv-art-qr" aria-hidden>
      <QRCodeSVG value="https://smartloyalty.app" size={150} level="M" bgColor="transparent" fgColor="#19c58a" />
      <span className="nv-art-qr-scan" />
    </div>
  );
}
