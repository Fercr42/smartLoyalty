import { QRCodeSVG } from "qrcode.react";
import { auth } from "../firebase/config";

export default function CompanyQR() {
  const qrData = JSON.stringify({ companyId: auth.currentUser?.uid });

  return (
    <div className="text-center mt-6">
      <h3 className="text-lg mb-2">Tu código QR</h3>
      <QRCodeSVG value={qrData} size={180} />
      <p className="text-sm mt-2 text-gray-500">
        Escanéalo desde la app móvil para suscribirse
      </p>
    </div>
  );
}
