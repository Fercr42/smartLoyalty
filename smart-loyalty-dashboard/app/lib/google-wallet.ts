import { createSign } from "crypto";

// Google Wallet con la misma cuenta de servicio de Firebase.
// Tarjeta genérica: una clase por restaurante, un objeto por cliente.

const API = "https://walletobjects.googleapis.com/walletobjects/v1";

type ServiceAccount = { client_email: string; private_key: string };
const serviceAccount = (): ServiceAccount => JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT ?? "{}");

export const walletIssuerId = () => process.env.GOOGLE_WALLET_ISSUER_ID?.trim() ?? "";
const classId = (companyId: string) => `${walletIssuerId()}.company_${companyId}`;
const text = (value: string) => ({ defaultValue: { language: "es", value } });

function signJwt(payload: object) {
  const encode = (v: object) => Buffer.from(JSON.stringify(v)).toString("base64url");
  const unsigned = `${encode({ alg: "RS256", typ: "JWT" })}.${encode(payload)}`;
  const signature = createSign("RSA-SHA256").update(unsigned).sign(serviceAccount().private_key, "base64url");
  return `${unsigned}.${signature}`;
}

let cachedToken: { value: string; expires: number } | null = null;

async function accessToken() {
  if (cachedToken && cachedToken.expires > Date.now() + 60_000) return cachedToken.value;
  const now = Math.floor(Date.now() / 1000);
  const assertion = signJwt({
    iss: serviceAccount().client_email,
    scope: "https://www.googleapis.com/auth/wallet_object.issuer",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Google OAuth: ${data.error_description ?? data.error}`);
  cachedToken = { value: data.access_token, expires: Date.now() + data.expires_in * 1000 };
  return cachedToken.value;
}

type Card = {
  companyId: string;
  memberId: string;
  origin: string;
  name: string;
  description: string;
  logoUrl: string;
  color: string;
};

// Enlace "Guardar en Google Wallet". Crea la clase y la tarjeta al guardarla.
export function googleWalletSaveUrl(card: Card) {
  const https = card.origin.startsWith("https://");
  const object = {
    id: `${walletIssuerId()}.${card.companyId}_${card.memberId}`,
    classId: classId(card.companyId),
    state: "ACTIVE",
    cardTitle: text(card.name),
    header: text("Cliente frecuente"),
    subheader: text("Membresía"),
    hexBackgroundColor: card.color,
    ...(card.logoUrl.startsWith("https://")
      ? { logo: { sourceUri: { uri: card.logoUrl }, contentDescription: text(card.name) } }
      : {}),
    barcode: {
      type: "QR_CODE",
      value: card.memberId,
      alternateText: card.memberId.slice(0, 8).toUpperCase(),
    },
    ...(card.description
      ? { textModulesData: [{ id: "about", header: "Sobre nosotros", body: card.description }] }
      : {}),
    ...(https
      ? { linksModuleData: { uris: [{ id: "promos", uri: `${card.origin}/join/${card.companyId}`, description: "Promociones" }] } }
      : {}),
  };

  const token = signJwt({
    iss: serviceAccount().client_email,
    aud: "google",
    typ: "savetowallet",
    iat: Math.floor(Date.now() / 1000),
    ...(https ? { origins: [card.origin] } : {}),
    payload: {
      genericClasses: [{ id: classId(card.companyId) }],
      genericObjects: [object],
    },
  });
  return `https://pay.google.com/gp/v/save/${token}`;
}

// Mensaje con notificación a todas las tarjetas del restaurante.
// Google limita las notificaciones a unas pocas por tarjeta al día; el mensaje igual queda en la tarjeta.
export async function notifyWalletHolders(companyId: string, title: string, body: string) {
  const res = await fetch(`${API}/genericClass/${encodeURIComponent(classId(companyId))}/addMessage`, {
    method: "POST",
    headers: { Authorization: `Bearer ${await accessToken()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      message: {
        id: `msg_${Date.now()}`,
        header: title,
        body,
        messageType: "TEXT_AND_NOTIFY",
        displayInterval: { end: { date: new Date(Date.now() + 7 * 86_400_000).toISOString() } },
      },
    }),
  });
  if (res.status === 404) return "sin-tarjetas"; // nadie ha guardado una tarjeta todavía
  if (!res.ok) throw new Error(`Google Wallet ${res.status}: ${await res.text()}`);
  return "ok";
}
