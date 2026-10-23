import { randomBytes, timingSafeEqual } from "crypto";
import { PKPass } from "passkit-generator";
import { cleanDesign } from "./card-design";
import { cardImageVersion } from "./card-version";
import { DEFAULT_BRAND, safeColor, textOn } from "./colors";
import { companyLocale } from "../i18n/config";
import { messages } from "../i18n/messages";
import { describeLink } from "./links";
import { validLocation } from "./location";
import { cleanLoyalty, formatBalance } from "./loyalty-mode";
import { cleanRewards, nextRewardText } from "./rewards";
import type { WalletCompany } from "./google-wallet";
import { passcreatorReady } from "./passcreator-config";

// Apple Wallet: un pase .pkpass (tipo storeCard) por cliente, firmado con el certificado del Pass Type ID.
// El iPhone se registra en /api/wallet/apple/v1/... y pide el pase nuevo cuando le avisamos por APNs.
// Todo se configura con variables de entorno; sin ellas el botón no aparece.

export type AppleConfig = {
  passTypeId: string;
  teamId: string;
  signerCert: string;
  signerKey: string;
  passphrase?: string;
  wwdr: string;
};

// Acepta el PEM tal cual, con "\n" escritos como texto (así quedan en Vercel) o en base64.
export function readPem(raw: string | undefined) {
  const value = (raw ?? "").trim();
  if (!value) return "";
  if (value.includes("-----BEGIN")) return value.replace(/\\n/g, "\n");
  const decoded = Buffer.from(value, "base64").toString("utf8");
  return decoded.includes("-----BEGIN") ? decoded : "";
}

export function appleConfig(env: Record<string, string | undefined> = process.env): AppleConfig | null {
  const config = {
    passTypeId: env.APPLE_WALLET_PASS_TYPE_ID?.trim() ?? "",
    teamId: env.APPLE_WALLET_TEAM_ID?.trim() ?? "",
    signerCert: readPem(env.APPLE_WALLET_CERT),
    signerKey: readPem(env.APPLE_WALLET_KEY),
    passphrase: env.APPLE_WALLET_KEY_PASSPHRASE || undefined,
    wwdr: readPem(env.APPLE_WALLET_WWDR),
  };
  const complete = config.passTypeId && config.teamId && config.signerCert && config.signerKey && config.wwdr;
  return complete ? config : null;
}

// Con certificado propio se firma aquí; si no, Passcreator firma los pases por nosotros.
export const appleProvider = (): "own" | "passcreator" | null => (appleConfig() ? "own" : passcreatorReady() ? "passcreator" : null);
export const appleWalletEnabled = () => appleProvider() !== null;

// Número de serie del pase: "{companyId}.{memberId}".
const COMPANY_ID = /^[A-Za-z0-9]{10,64}$/;
const MEMBER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const passSerial = (companyId: string, memberId: string) => `${companyId}.${memberId}`;
export function parseSerial(serial: string) {
  const [companyId, memberId, extra] = serial.split(".");
  return extra === undefined && COMPANY_ID.test(companyId ?? "") && MEMBER_ID.test(memberId ?? "")
    ? { companyId, memberId }
    : null;
}

// Token que el iPhone manda en cada llamada ("ApplePass {token}"). Es aleatorio y propio de cada tarjeta
// (se guarda en walletMembers.appleAuthToken): no se puede adivinar a partir del número de serie.
export const newPassAuthToken = () => randomBytes(24).toString("base64url");

export function validPassAuth(header: string | null, expected: string | undefined) {
  if (!expected) return false;
  const given = Buffer.from((header ?? "").replace(/^ApplePass\s+/i, ""));
  const wanted = Buffer.from(expected);
  return given.length === wanted.length && timingSafeEqual(given, wanted);
}

export type AppleMember = { stamps?: number; name?: string; applePromo?: Promo };
export type Promo = { title?: string; body?: string; at?: number };
export type AppleCompany = WalletCompany & { appleWalletPromo?: Promo };

const LINK = /^(https:\/\/|tel:|mailto:)\S+$/;
const clip = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");
const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const rgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
};

// Ancho aproximado de un texto en "letras" (un emoji ocupa como dos).
function visualWidth(text: string) {
  const parts =
    typeof Intl !== "undefined" && "Segmenter" in Intl
      ? [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text)].map((s) => s.segment)
      : [...text];
  return parts.reduce((sum, g) => sum + (/\p{Extended_Pictographic}/u.test(g) ? 2 : 1), 0);
}

// Nombre junto al logo: Apple lo pone en la misma fila que el saldo y, si es largo, se montan.
// Si no cabe, solo va el logo (el nombre igual sale en la pantalla de bloqueo y en los avisos).
export function logoTextFor(name: string, withBalance: boolean) {
  return visualWidth(name) <= (withBalance ? 15 : 24) ? name : undefined;
}

// La promo más reciente: la del cliente (envío por grupo) o la de todos.
function latestPromo(company: AppleCompany, member: AppleMember) {
  const promos = [company.appleWalletPromo, member.applePromo].filter((p): p is Promo => Boolean(p?.title));
  return promos.sort((a, b) => (b.at ?? 0) - (a.at ?? 0))[0];
}

// Colores de la tarjeta: los del diseño de marca si se usa en Wallet, si no el color de la tarjeta.
export function passColors(company: WalletCompany) {
  const design = company.cardDesign ? cleanDesign(company.cardDesign, company.brandColor) : null;
  // Con el diseño de marca, las etiquetas (SALDO, CLIENTE…) van en su color de acento.
  if (design?.useInWallet) return { background: design.bgColor, foreground: design.textColor, label: design.accentColor, drawn: true };
  const background = safeColor(company.walletCard?.color, safeColor(company.brandColor, DEFAULT_BRAND));
  const foreground = textOn(background);
  return { background, foreground, label: foreground, drawn: false };
}

// pass.json (sin imágenes). Función pura: la usan el pase nuevo, el pase actualizado y las pruebas.
export function passJson({
  company,
  memberId,
  member,
  origin,
  config,
  authToken,
}: {
  company: AppleCompany;
  memberId: string;
  member: AppleMember;
  origin: string;
  config: Pick<AppleConfig, "passTypeId" | "teamId">;
  authToken: string;
}) {
  const locale = companyLocale(company);
  const m = messages[locale];
  const p = m.pass;
  const card = company.walletCard ?? {};
  const name = clip(company.name, 60) || p.business;
  const rewards = cleanRewards(company.loyalty?.rewards);
  const loyalty = cleanLoyalty(company.loyalty);
  const stamps = member.stamps ?? 0;
  const memberName = clip(member.name, 40);
  const https = origin.startsWith("https://");
  const serial = passSerial(company.id, memberId);
  const colors = passColors(company);
  const showBalance = rewards.length > 0 || loyalty.mode === "cashback";

  const link = (key: string, label: string, url: string) => ({
    key,
    label,
    value: url,
    attributedValue: `<a href="${escapeHtml(url)}">${escapeHtml(label)}</a>`,
  });

  const reviews = company.reviews;
  const review =
    https && reviews?.enabled
      ? reviews.survey !== false
        ? `${origin}/encuesta/${company.id}?m=${encodeURIComponent(memberId)}`
        : /^https:\/\/\S+$/.test(reviews.url ?? "")
          ? `${origin}/r/${company.id}`
          : ""
      : "";
  const promo = latestPromo(company, member);

  const backFields = [
    // Al cambiar, el iPhone la muestra como notificación ("%@" = el texto nuevo).
    ...(promo
      ? [{ key: "promo", label: p.latestPromo, value: clip(`${promo.title}\n${promo.body ?? ""}`, 500), changeMessage: "%@" }]
      : []),
    ...(review ? [link("review", p.rateVisit, review)] : []),
    ...(company.description ? [{ key: "about", label: p.about, value: clip(company.description, 500) }] : []),
    ...(card.info ?? [])
      .map((row, i) => ({ key: `info_${i}`, label: clip(row.label, 40), value: clip(row.value, 200) }))
      .filter((f) => f.label && f.value),
    ...(card.links ?? [])
      .map((row, i) => {
        const url = clip(row.url, 500);
        return LINK.test(url) ? link(`link_${i}`, describeLink(clip(row.label, 40), url, p), url) : null;
      })
      .filter((f): f is ReturnType<typeof link> => f !== null),
    ...(https ? [link("promos", p.promotions, `${origin}/join/${company.id}`)] : []),
    { key: "code", label: p.cardCode, value: memberId.slice(0, 8).toUpperCase() },
  ];

  const location = validLocation(company.location);

  return {
    formatVersion: 1,
    passTypeIdentifier: config.passTypeId,
    teamIdentifier: config.teamId,
    serialNumber: serial,
    authenticationToken: authToken,
    // Apple solo acepta HTTPS: en desarrollo (localhost) el pase no se actualiza solo.
    ...(https ? { webServiceURL: `${origin}/api/wallet/apple` } : {}),
    organizationName: name,
    description: `${name} · ${p.member}`,
    logoText: card.wideLogoUrl ? undefined : logoTextFor(name, showBalance),
    backgroundColor: rgb(colors.background),
    foregroundColor: rgb(colors.foreground),
    labelColor: rgb(colors.label),
    sharingProhibited: true,
    barcodes: [
      {
        format: "PKBarcodeFormatQR",
        message: memberId,
        messageEncoding: "iso-8859-1",
        altText: memberId.slice(0, 8).toUpperCase(),
      },
    ],
    ...(location ? { locations: [{ latitude: location.lat, longitude: location.lng, relevantText: name }] } : {}),
    storeCard: {
      headerFields: showBalance
        ? [
            {
              key: "balance",
              label: p.unit[loyalty.mode],
              value: formatBalance(stamps, loyalty, locale),
              changeMessage: p.balanceChanged,
              textAlignment: "PKTextAlignmentRight",
            },
          ]
        : [],
      primaryFields: [],
      secondaryFields: [
        {
          key: "member",
          label: memberName ? clip(card.header, 40) || p.member : p.member,
          value: memberName || clip(card.subheader, 40) || p.membership,
        },
      ],
      auxiliaryFields: rewards.length
        ? [
            {
              key: "next_reward",
              label: p.reward,
              value: nextRewardText(rewards, stamps, m.rewardText, locale) || m.rewardText.keepGoing,
              changeMessage: "%@",
            },
          ]
        : [],
      backFields,
    },
  };
}

// Imágenes del pase en PNG. Apple exige icon.png; logo y franja son opcionales.
export type PassImages = Partial<Record<
  "icon.png" | "icon@2x.png" | "icon@3x.png" | "logo.png" | "logo@2x.png" | "logo@3x.png" | "strip.png" | "strip@2x.png" | "strip@3x.png",
  Buffer
>>;

// Firma y empaqueta el pase. Devuelve el .pkpass listo para enviar al iPhone.
export function packPass(json: object, images: PassImages, config: AppleConfig) {
  const buffers: Record<string, Buffer> = { "pass.json": Buffer.from(JSON.stringify(json)) };
  for (const [file, data] of Object.entries(images)) if (data?.length) buffers[file] = data;
  const pass = new PKPass(buffers, {
    wwdr: config.wwdr,
    signerCert: config.signerCert,
    signerKey: config.signerKey,
    signerKeyPassphrase: config.passphrase,
  });
  return pass.getAsBuffer();
}

// URL de la franja: la tarjeta dibujada con los puntos (si se usa en Wallet) o la portada que subió el dueño.
export function stripSource(company: WalletCompany, origin: string, stamps: number) {
  if (passColors(company).drawn) {
    return `${origin}/card-image/${company.id}?variant=hero&s=${stamps}&v=${cardImageVersion(company)}`;
  }
  const hero = company.walletCard?.heroUrl ?? "";
  return hero.startsWith("/") ? `${origin}${hero}` : hero.startsWith("https://") ? hero : "";
}
