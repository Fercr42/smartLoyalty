import { createSign } from "crypto";
import { DEFAULT_BRAND, safeColor } from "./colors";
import { describeLink } from "./links";
import { validLocation } from "./location";
import { cleanRewards, nextRewardText } from "./rewards";

// Google Wallet con la misma cuenta de servicio de Firebase.
// Tarjeta genérica: una clase por restaurante, un objeto por cliente.

const API = "https://walletobjects.googleapis.com/walletobjects/v1";

type ServiceAccount = { client_email: string; private_key: string };
const serviceAccount = (): ServiceAccount => JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT ?? "{}");

export const walletIssuerId = () => process.env.GOOGLE_WALLET_ISSUER_ID?.trim() ?? "";
const classId = (companyId: string) => `${walletIssuerId()}.company_${companyId}`;
const objectId = (companyId: string, memberId: string) => `${walletIssuerId()}.${companyId}_${memberId}`;
const text = (value: string) => ({ defaultValue: { language: "es", value } });

export type WalletCard = {
  color?: string;
  header?: string;
  subheader?: string;
  heroUrl?: string;
  wideLogoUrl?: string;
  info?: { label: string; value: string }[];
  links?: { label: string; url: string }[];
};

export type WalletCompany = {
  id: string;
  name?: string;
  description?: string;
  logoUrl?: string;
  brandColor?: string;
  walletCard?: WalletCard;
  loyalty?: { rewards?: unknown; walletTemplate?: number };
  location?: unknown;
};

// Sube este número si cambia LOYALTY_TEMPLATE, para que se vuelva a aplicar a las clases.
export const WALLET_TEMPLATE_VERSION = 1;

// Muestra sellos y próximo premio en el frente de la tarjeta.
const LOYALTY_TEMPLATE = {
  cardTemplateOverride: {
    cardRowTemplateInfos: [
      {
        twoItems: {
          startItem: { firstValue: { fields: [{ fieldPath: "object.textModulesData['stamps']" }] } },
          endItem: { firstValue: { fields: [{ fieldPath: "object.textModulesData['next_reward']" }] } },
        },
      },
    ],
  },
};

const LINK = /^(https:\/\/|tel:|mailto:)\S+$/;
const clip = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");
const absolute = (url: string | undefined, origin: string) => (url?.startsWith("/") ? `${origin}${url}` : url ?? "");
const image = (uri: string, alt: string) =>
  uri.startsWith("https://") ? { sourceUri: { uri }, contentDescription: text(alt) } : undefined;

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

async function walletApi(path: string, init: RequestInit = {}) {
  return fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${await accessToken()}`, "Content-Type": "application/json" },
  });
}

// Lo que se ve en la tarjeta. Lo usan la creación y la actualización, así siempre coinciden.
function cardFields(company: WalletCompany, origin: string, stamps = 0) {
  const card = company.walletCard ?? {};
  const name = clip(company.name, 60) || "Restaurante";
  const rewards = cleanRewards(company.loyalty?.rewards);

  const modules = [
    ...(rewards.length
      ? [
          { id: "stamps", header: "Sellos", body: String(stamps) },
          { id: "next_reward", header: "Premio", body: nextRewardText(rewards, stamps) || "Sigue sumando" },
        ]
      : []),
    ...(company.description ? [{ id: "about", header: "Sobre nosotros", body: clip(company.description, 500) }] : []),
    ...(card.info ?? [])
      .map((row, i) => ({ id: `info_${i}`, header: clip(row.label, 40), body: clip(row.value, 200) }))
      .filter((m) => m.header && m.body),
  ];
  const uris = [
    ...(card.links ?? [])
      .map((row, i) => ({
        id: `link_${i}`,
        description: describeLink(clip(row.label, 40), clip(row.url, 500)),
        uri: clip(row.url, 500),
      }))
      .filter((l) => LINK.test(l.uri)),
    ...(origin.startsWith("https://")
      ? [{ id: "promos", description: "Promociones", uri: `${origin}/join/${company.id}` }]
      : []),
  ];

  return {
    cardTitle: text(name),
    header: text(clip(card.header, 40) || "Cliente frecuente"),
    subheader: text(clip(card.subheader, 40) || "Membresía"),
    hexBackgroundColor: safeColor(card.color, safeColor(company.brandColor, DEFAULT_BRAND)),
    logo: image(absolute(company.logoUrl, origin), name),
    // Logo ancho: Google lo muestra en grande arriba, en lugar del logo pequeño.
    wideLogo: image(absolute(card.wideLogoUrl, origin), name),
    heroImage: image(absolute(card.heroUrl, origin), name),
    textModulesData: modules.length ? modules : undefined,
    linksModuleData: uris.length ? { uris } : undefined,
  };
}

const hasRewards = (company: WalletCompany) => cleanRewards(company.loyalty?.rewards).length > 0;

// Enlace "Guardar en Google Wallet". Crea la clase y la tarjeta al guardarla.
export function googleWalletSaveUrl({
  company,
  memberId,
  origin,
  stamps = 0,
}: {
  company: WalletCompany;
  memberId: string;
  origin: string;
  stamps?: number;
}) {
  const object = {
    id: objectId(company.id, memberId),
    classId: classId(company.id),
    state: "ACTIVE",
    ...cardFields(company, origin, stamps),
    barcode: { type: "QR_CODE", value: memberId, alternateText: memberId.slice(0, 8).toUpperCase() },
  };

  const token = signJwt({
    iss: serviceAccount().client_email,
    aud: "google",
    typ: "savetowallet",
    iat: Math.floor(Date.now() / 1000),
    ...(origin.startsWith("https://") ? { origins: [origin] } : {}),
    payload: {
      genericClasses: [
        { id: classId(company.id), ...(hasRewards(company) ? { classTemplateInfo: LOYALTY_TEMPLATE } : {}) },
      ],
      genericObjects: [object],
    },
  });
  return `https://pay.google.com/gp/v/save/${token}`;
}

// Ajustes de la clase del restaurante: sellos y premio en el frente de la tarjeta,
// y la ubicación para que Google muestre la tarjeta cerca del local. false si aún no hay tarjetas.
export async function applyClassSettings(company: WalletCompany) {
  const settings: Record<string, unknown> = {};
  if (hasRewards(company)) settings.classTemplateInfo = LOYALTY_TEMPLATE;
  const location = validLocation(company.location);
  if (location) settings.merchantLocations = [{ latitude: location.lat, longitude: location.lng }];
  if (!Object.keys(settings).length) return false;

  const path = `/genericClass/${encodeURIComponent(classId(company.id))}`;
  let res = await walletApi(path, { method: "PATCH", body: JSON.stringify(settings) });
  if (res.status === 400 && settings.merchantLocations) {
    // Si Google rechaza la ubicación, no bloquear el resto de los ajustes.
    console.error("Wallet rechazó merchantLocations", await res.text());
    delete settings.merchantLocations;
    if (!Object.keys(settings).length) return false;
    res = await walletApi(path, { method: "PATCH", body: JSON.stringify(settings) });
  }
  if (res.status === 404) return false;
  if (!res.ok) throw new Error(`Google Wallet ${res.status}: ${await res.text()}`);
  return true;
}

// Actualiza los sellos en la tarjeta de un cliente. false si no la guardó en Wallet.
export async function updateMemberCard(company: WalletCompany, memberId: string, stamps: number, origin: string) {
  const res = await walletApi(`/genericObject/${encodeURIComponent(objectId(company.id, memberId))}`, {
    method: "PATCH",
    body: JSON.stringify({ textModulesData: cardFields(company, origin, stamps).textModulesData ?? [] }),
  });
  if (res.status === 404) return false;
  if (!res.ok) throw new Error(`Google Wallet ${res.status}: ${await res.text()}`);
  return true;
}

// Aplica el diseño actual a todas las tarjetas que los clientes ya guardaron. Devuelve cuántas cambió.
export async function syncWalletCards(
  company: WalletCompany,
  origin: string,
  stampsByMember: Record<string, number> = {}
) {
  await applyClassSettings(company);
  let pageToken = "";
  let updated = 0;
  do {
    const query = `classId=${encodeURIComponent(classId(company.id))}&maxResults=100${
      pageToken ? `&token=${encodeURIComponent(pageToken)}` : ""
    }`;
    const res = await walletApi(`/genericObject?${query}`);
    if (res.status === 404) return updated; // nadie ha guardado una tarjeta todavía
    if (!res.ok) throw new Error(`Google Wallet ${res.status}: ${await res.text()}`);
    const data = await res.json();
    const objects: { id: string }[] = data.resources ?? [];

    for (let i = 0; i < objects.length; i += 10) {
      await Promise.all(
        objects.slice(i, i + 10).map(async (object) => {
          const memberId = object.id.slice(object.id.lastIndexOf("_") + 1);
          // Los campos en undefined se quitan (ej. si se borró la portada).
          const r = await walletApi(`/genericObject/${encodeURIComponent(object.id)}`, {
            method: "PUT",
            body: JSON.stringify({ ...object, ...cardFields(company, origin, stampsByMember[memberId] ?? 0) }),
          });
          if (r.ok) updated++;
          else console.error("Wallet PUT", object.id, r.status, await r.text());
        })
      );
    }
    pageToken = data.pagination?.nextPageToken ?? "";
  } while (pageToken);
  return updated;
}

// Los mensajes de Wallet no llevan enlace y Google no avisa cuándo se leen. Para medir aperturas,
// la tarjeta muestra un enlace a la última promo (a nivel clase = todos; a nivel tarjeta = solo esos clientes).
export async function setWalletPromoLink(
  company: WalletCompany,
  origin: string,
  promo: { title: string; url: string },
  memberIds: string[] | null
) {
  const description = `Ver: ${promo.title}`.slice(0, 60);
  if (!memberIds) {
    const res = await walletApi(`/genericClass/${encodeURIComponent(classId(company.id))}`, {
      method: "PATCH",
      body: JSON.stringify({ linksModuleData: { uris: [{ id: "class_promo", uri: promo.url, description }] } }),
    });
    if (!res.ok && res.status !== 404) throw new Error(`Google Wallet ${res.status}: ${await res.text()}`);
    return;
  }
  const baseLinks = cardFields(company, origin).linksModuleData?.uris ?? [];
  const uris = [{ id: "member_promo", uri: promo.url, description }, ...baseLinks];
  for (let i = 0; i < memberIds.length; i += 10) {
    await Promise.all(
      memberIds.slice(i, i + 10).map(async (memberId) => {
        const res = await walletApi(`/genericObject/${encodeURIComponent(objectId(company.id, memberId))}`, {
          method: "PATCH",
          body: JSON.stringify({ linksModuleData: { uris } }),
        });
        if (!res.ok && res.status !== 404) console.error("Wallet enlace promo", memberId, res.status, await res.text());
      })
    );
  }
}

// ¿El cliente guardó de verdad su tarjeta en Google Wallet? (tocar el botón no basta: puede no guardarla)
export async function walletCardSaved(companyId: string, memberId: string) {
  if (!walletIssuerId()) return false;
  const res = await walletApi(`/genericObject/${encodeURIComponent(objectId(companyId, memberId))}`);
  if (!res.ok) return false;
  const data = await res.json();
  return data.hasUsers !== false;
}

const walletMessage = (title: string, body: string) =>
  JSON.stringify({
    message: {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      header: title,
      body,
      messageType: "TEXT_AND_NOTIFY",
      displayInterval: { end: { date: new Date(Date.now() + 7 * 86_400_000).toISOString() } },
    },
  });

// Mensaje con notificación a la tarjeta de un solo cliente (envíos por grupo). false si no la guardó.
export async function notifyWalletMember(companyId: string, memberId: string, title: string, body: string) {
  const res = await walletApi(`/genericObject/${encodeURIComponent(objectId(companyId, memberId))}/addMessage`, {
    method: "POST",
    body: walletMessage(title, body),
  });
  if (res.status === 404) return false;
  if (!res.ok) throw new Error(`Google Wallet ${res.status}: ${await res.text()}`);
  return true;
}

// Mensaje con notificación a todas las tarjetas del restaurante.
// Google limita las notificaciones a unas pocas por tarjeta al día; el mensaje igual queda en la tarjeta.
export async function notifyWalletHolders(companyId: string, title: string, body: string) {
  const res = await walletApi(`/genericClass/${encodeURIComponent(classId(companyId))}/addMessage`, {
    method: "POST",
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
  if (res.status === 404) return "sin-tarjetas";
  if (!res.ok) throw new Error(`Google Wallet ${res.status}: ${await res.text()}`);
  return "ok";
}
