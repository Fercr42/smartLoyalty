import { createHash } from "crypto";
import { adminDb } from "../firebase/admin";
import { messages } from "../i18n/messages";
import { companyLocale } from "../i18n/config";
import { passColors, passJson, stripSource, type AppleCompany, type AppleMember } from "./apple-wallet";
import { validLocation } from "./location";
import { renderPassImages } from "./apple-pass-images";

// Apple Wallet a través de Passcreator, mientras no tengamos certificado propio de Apple.
// Passcreator firma los pases con su cuenta de Apple. Nosotros:
//  1) creamos una plantilla por negocio con su diseño (logo, colores, franja, textos),
//  2) creamos un pase por cliente con sus datos (puntos, premio, nombre, promo),
//  3) actualizamos el pase cuando cambian los datos; Passcreator avisa al iPhone.
// Variables: PASSCREATOR_API_KEY (secreta) y PASSCREATOR_TEMPLATE_ID (una plantilla "Store Card" cualquiera
// creada a mano en Passcreator, de donde se lee el Pass Type ID de la cuenta).

const API = "https://app.passcreator.com";
const TIMEZONE = () => process.env.PASSCREATOR_TIMEZONE?.trim() || "America/Costa_Rica";

const apiKey = () => process.env.PASSCREATOR_API_KEY?.trim() ?? "";
const baseTemplate = () => process.env.PASSCREATOR_TEMPLATE_ID?.trim() ?? "";

// Datos que cambian por cliente. Son "propiedades adicionales" de la plantilla: {balance}, {member}, etc.
const PROPS = ["balance", "member", "reward", "promo", "review", "code"] as const;
type Prop = (typeof PROPS)[number];
export type PassValues = Record<Prop, string>;

const DUMMY_MEMBER = "00000000-0000-4000-8000-000000000000";
const DUMMY_CONFIG = { passTypeId: "pass.passcreator", teamId: "PASSCREATOR" };

type JsonField = { key: string; label?: string; value?: string; changeMessage?: string; textAlignment?: string };

async function call<T = Record<string, unknown>>(path: string, init: { method: string; body?: unknown }): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: init.method,
    headers: { Authorization: apiKey(), "Content-Type": "application/json", Accept: "application/json" },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    signal: AbortSignal.timeout(20_000),
  });
  const text = await res.text();
  // Los errores pueden repetir la imagen en base64: se recorta para que el motivo quede visible.
  const reason = text.replace(/(data:image\/[a-z]+;base64,)?[A-Za-z0-9+/=]{120,}/g, "[imagen]").slice(0, 600);
  if (!res.ok) throw new Error(`Passcreator ${init.method} ${path.split("?")[0]} ${res.status}: ${reason}`);
  try {
    return (text ? JSON.parse(text) : {}) as T;
  } catch {
    return {} as T;
  }
}

const absolute = (url: string | undefined, origin: string) => {
  const u = url?.startsWith("/") ? `${origin}${url}` : url ?? "";
  return u.startsWith("https://") ? u : "";
};

const field = (f: Partial<JsonField> & { label?: string; value: string }) => ({
  type: "text",
  label: f.label ?? "",
  value: f.value,
  changeMessage: f.changeMessage ?? "",
  ...(f.textAlignment ? { alignment: f.textAlignment } : {}),
});

// El pass.json de siempre, armado con datos de ejemplo: de ahí salen etiquetas y textos fijos de la plantilla.
const sample = (company: AppleCompany, origin: string) =>
  passJson({ company, memberId: DUMMY_MEMBER, member: { stamps: 0 }, origin, config: DUMMY_CONFIG, authToken: "-" });

// Plantilla del negocio en el formato de Passcreator (API v2). Función pura para poder probarla.
export function templateBody(company: AppleCompany, origin: string, passTypeId: string) {
  const json = sample(company, origin);
  const store = json.storeCard;
  const p = messages[companyLocale(company)].pass;
  const card = company.walletCard ?? {};
  const colors = passColors(company);
  const name = json.organizationName;
  const logo = absolute(card.wideLogoUrl, origin) || absolute(company.logoUrl, origin);
  const icon = absolute(company.logoUrl, origin) || `${origin}/icon.png`;
  const strip = absolute(stripSource(company, origin, 0), origin);
  const location = validLocation(company.location);
  const back = store.backFields as JsonField[];
  const hasReview = back.some((f) => f.key === "review");
  const header = store.headerFields as JsonField[];
  const aux = store.auxiliaryFields as JsonField[];

  return {
    name: `Smart Loyalty ${company.id}`,
    description: json.description,
    organizationName: name,
    type: "storeCard",
    passTypeId,
    googlePayActive: false,
    logoText: json.logoText ?? "",
    sharingProhibited: true,
    useAutomaticColors: false,
    colors: {
      backgroundColor: colors.background,
      foregroundColor: colors.foreground,
      labelColor: colors.foreground,
      backgroundColorDifferentForEachPass: false,
      foregroundColorDifferentForEachPass: false,
      labelColorDifferentForEachPass: false,
    },
    images: {
      icon,
      logo: logo || null,
      logoHidden: !logo,
      logoDifferentForEachPass: false,
      background: strip || null,
      backgroundHidden: !strip,
      backgroundDifferentForEachPass: false,
    },
    barcode: {
      format: "PKBarcodeFormatQR",
      value: "",
      valueDifferentForEachPass: true,
      useAutoIdForValue: false,
      alternativeText: "{code}",
      alternativeTextDifferentForEachPass: false,
      useAutoIdForAlternativeText: false,
    },
    fields: {
      headerFields: header.map((f) => field({ label: f.label, value: "{balance}", changeMessage: f.changeMessage, textAlignment: f.textAlignment })),
      primaryFields: [],
      secondaryFields: [field({ label: card.header?.trim().slice(0, 40) || p.member, value: "{member}" })],
      auxiliaryFields: aux.map((f) => field({ label: f.label, value: "{reward}", changeMessage: "%@" })),
      backFields: [
        // La promo nueva aparece como notificación en el iPhone.
        field({ label: p.latestPromo, value: "{promo}", changeMessage: "%@" }),
        ...(hasReview ? [field({ label: p.rateVisit, value: "{review}" })] : []),
        ...back
          .filter((f) => !["promo", "review", "code"].includes(f.key))
          .map((f) => field({ label: f.label, value: String(f.value ?? "") })),
        field({ label: p.cardCode, value: "{code}" }),
      ],
    },
    additionalProperties: PROPS.map((prop) => ({ name: prop, type: "text", required: false, hidden: false })),
    locationsDisabled: !location,
    locations: location ? [{ name, latitude: String(location.lat), longitude: String(location.lng), relevantText: name }] : [],
  };
}

// Valores del cliente para los {campos} de la plantilla.
export function passValues(company: AppleCompany, memberId: string, member: AppleMember, origin: string): PassValues {
  const json = passJson({ company, memberId, member, origin, config: DUMMY_CONFIG, authToken: "-" });
  const store = json.storeCard;
  const pick = (list: unknown, key: string) => String((list as JsonField[]).find((f) => f.key === key)?.value ?? "");
  return {
    balance: pick(store.headerFields, "balance"),
    member: pick(store.secondaryFields, "member"),
    reward: pick(store.auxiliaryFields, "next_reward"),
    promo: pick(store.backFields, "promo"),
    review: pick(store.backFields, "review"),
    code: pick(store.backFields, "code"),
  };
}

const hashOf = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 32);

// Las imágenes se mandan ya hechas en PNG (base64), las mismas del pase propio: así Passcreator no depende
// de poder descargar nuestras URLs (la versión de prueba está protegida) ni de formatos como WebP.
async function withImages(body: ReturnType<typeof templateBody>, company: AppleCompany, origin: string) {
  const png = await renderPassImages(company, origin, 0);
  const b64 = (buf?: Buffer) => (buf?.length ? `data:image/png;base64,${buf.toString("base64")}` : null);
  const icon = b64(png["icon@3x.png"] ?? png["icon@2x.png"] ?? png["icon.png"]);
  const logo = b64(png["logo@3x.png"] ?? png["logo@2x.png"] ?? png["logo.png"]);
  const strip = b64(png["strip@3x.png"] ?? png["strip@2x.png"] ?? png["strip.png"]);
  return {
    ...body,
    images: {
      ...body.images,
      ...(icon ? { icon } : {}),
      logo: logo ?? body.images.logo,
      logoHidden: !(logo ?? body.images.logo),
      background: strip ?? body.images.background,
      backgroundHidden: !(strip ?? body.images.background),
    },
  };
}

// "YYYY-MM-DD HH:MM" en la zona horaria de la cuenta de Passcreator (un minuto atrás: que publique ya).
function publicationDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE(),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(Date.now() - 60_000));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}`;
}

// Pass Type ID de la cuenta, leído de la plantilla base (se guarda para no pedirlo cada vez).
let passTypeCache = "";
async function accountPassTypeId() {
  if (passTypeCache) return passTypeCache;
  const res = await call<Record<string, unknown>>(`/api/v2/pass-template/${encodeURIComponent(baseTemplate())}/describe`, { method: "GET" });
  const data = (res.data ?? res) as Record<string, unknown>;
  const id = String(data.passTypeId ?? "");
  if (!id) throw new Error("Passcreator: la plantilla base no tiene Pass Type ID");
  passTypeCache = id;
  return id;
}

type CompanyPasscreator = { templateId?: string; hash?: string };

// Crea o actualiza la plantilla del negocio si su diseño cambió. Devuelve el id de la plantilla.
export async function ensureTemplate(company: AppleCompany & { passcreator?: CompanyPasscreator }, origin: string) {
  const ref = adminDb().collection("companies").doc(company.id);
  const passTypeId = await accountPassTypeId();
  const body = templateBody(company, origin, passTypeId);
  const hash = hashOf(body);
  const saved = company.passcreator ?? {};
  if (saved.templateId && saved.hash === hash) return saved.templateId;

  const full = await withImages(body, company, origin);
  if (saved.templateId) {
    await call(`/api/v2/pass-template/${encodeURIComponent(saved.templateId)}`, { method: "POST", body: full });
    // Que los pases que ya tienen los clientes tomen el diseño nuevo.
    await call(`/api/v2/pass-template/${encodeURIComponent(saved.templateId)}/publish`, {
      method: "POST",
      body: { publicationDate: publicationDate() },
    }).catch((e) => console.error("Passcreator publicar", e));
    await ref.set({ passcreator: { templateId: saved.templateId, hash } }, { merge: true });
    return saved.templateId;
  }

  const res = await call<Record<string, unknown>>("/api/v2/pass-template", { method: "POST", body: full });
  const data = (res.data ?? res) as Record<string, unknown>;
  const templateId = String(data.identifier ?? "");
  if (!templateId) throw new Error(`Passcreator: no devolvió el id de la plantilla (${JSON.stringify(res).slice(0, 200)})`);
  await ref.set({ passcreator: { templateId, hash } }, { merge: true });
  return templateId;
}

type MemberPasscreator = { passId?: string; uri?: string; templateId?: string };

// Lee negocio y cliente (las tarjetas unidas a otra muestran los datos de la principal).
async function load(companyId: string, memberId: string) {
  const companyRef = adminDb().collection("companies").doc(companyId);
  const memberRef = companyRef.collection("walletMembers").doc(memberId);
  const [company, member] = await Promise.all([companyRef.get(), memberRef.get()]);
  if (!company.exists || !member.exists) return null;
  let data = (member.data() ?? {}) as AppleMember & { mergedInto?: string; passcreator?: MemberPasscreator };
  const own = data.passcreator;
  if (data.mergedInto) {
    const main = await companyRef.collection("walletMembers").doc(data.mergedInto).get();
    if (main.exists) data = { ...(main.data() as AppleMember), applePromo: data.applePromo ?? main.data()?.applePromo };
  }
  return { companyData: { ...company.data(), id: companyId } as AppleCompany & { passcreator?: CompanyPasscreator }, memberRef, data, own };
}

// Enlace para guardar el pase en el iPhone. Crea el pase del cliente la primera vez.
export async function passLink(companyId: string, memberId: string, origin: string) {
  const loaded = await load(companyId, memberId);
  if (!loaded) return null;
  const { companyData, memberRef, data, own } = loaded;
  const templateId = await ensureTemplate(companyData, origin);
  const values = passValues(companyData, memberId, data, origin);

  if (own?.passId && own.uri && own.templateId === templateId) {
    // Ya existe: se refrescan los datos por si cambiaron y se reusa el enlace.
    await call(`/api/v3/pass/${encodeURIComponent(own.passId)}`, { method: "PATCH", body: { data: values } }).catch((e) =>
      console.error("Passcreator actualizar", e)
    );
    return own.uri;
  }

  const res = await call<Record<string, unknown>>("/api/v3/pass?async=false", {
    method: "POST",
    body: { data: { templateId, userProvidedId: `${companyId}.${memberId}`, barcodeValue: memberId, ...values } },
  });
  const created = (res.data ?? res) as Record<string, unknown>;
  const passId = String(created.identifier ?? "");
  const uri = String(created.iPhoneUri ?? created.downloadPage ?? "");
  if (!passId || !uri) throw new Error(`Passcreator: respuesta sin pase (${JSON.stringify(res).slice(0, 200)})`);
  await memberRef.set({ passcreator: { passId, uri, templateId }, appleWallet: true }, { merge: true });
  return uri;
}

// Actualiza los pases de esos clientes (null = todos los del negocio). Devuelve cuántos actualizó.
export async function refreshPasscreatorPasses(companyId: string, memberIds: string[] | null, origin: string) {
  const db = adminDb();
  const companyRef = db.collection("companies").doc(companyId);
  const company = await companyRef.get();
  if (!company.exists) return 0;
  const companyData = { ...company.data(), id: companyId } as AppleCompany & { passcreator?: CompanyPasscreator };
  if (!companyData.passcreator?.templateId) return 0; // nadie ha guardado el pase todavía
  await ensureTemplate(companyData, origin);

  let docs;
  if (memberIds) {
    if (!memberIds.length) return 0;
    const ids = new Set(memberIds);
    // También las tarjetas unidas a estas.
    for (let i = 0; i < memberIds.length; i += 30) {
      const merged = await companyRef.collection("walletMembers").where("mergedInto", "in", memberIds.slice(i, i + 30)).select().get();
      merged.docs.forEach((d) => ids.add(d.id));
    }
    const refs = [...ids].map((id) => companyRef.collection("walletMembers").doc(id));
    docs = (await db.getAll(...refs)).filter((d) => d.exists && d.data()?.passcreator?.passId);
  } else {
    docs = (await companyRef.collection("walletMembers").where("passcreator.passId", ">", "").get()).docs;
  }

  let updated = 0;
  for (let i = 0; i < docs.length; i += 6) {
    await Promise.all(
      docs.slice(i, i + 6).map(async (doc) => {
        const loaded = await load(companyId, doc.id);
        const passId = loaded?.own?.passId;
        if (!loaded || !passId) return;
        const values = passValues(loaded.companyData, doc.id, loaded.data, origin);
        try {
          await call(`/api/v3/pass/${encodeURIComponent(passId)}`, { method: "PATCH", body: { data: values } });
          updated++;
        } catch (e) {
          console.error("Passcreator actualizar", doc.id, e);
        }
      })
    );
  }
  return updated;
}

// Clientes con pase de Apple Wallet hecho por Passcreator.
export async function passcreatorHolders(companyId: string) {
  const snap = await adminDb().collection("companies").doc(companyId).collection("walletMembers").where("passcreator.passId", ">", "").select().get();
  return snap.docs.map((d) => d.id);
}

export async function passcreatorSaved(companyId: string, memberId: string) {
  const doc = await adminDb().collection("companies").doc(companyId).collection("walletMembers").doc(memberId).get();
  return Boolean(doc.data()?.passcreator?.passId);
}

// Prueba de punta a punta (solo en la versión de prueba): crea una plantilla de ejemplo y un pase,
// y devuelve el enlace para abrirlo en un iPhone. No toca datos de negocios reales.
export async function passcreatorSelfTest(origin: string) {
  const steps: Record<string, unknown> = {};
  const passTypeId = await accountPassTypeId();
  steps.passTypeId = passTypeId;
  const company: AppleCompany = {
    id: "PRUEBApasscreator",
    name: "Café Luna (prueba)",
    brandColor: "#2a1c15",
    description: "Pase de prueba de Smart Loyalty",
    loyalty: { mode: "stamps", rewards: [{ id: "r1", title: "Café gratis", stamps: 10 }] },
    walletCard: { header: "Cliente frecuente" },
  };
  const body = await withImages(templateBody(company, origin, passTypeId), company, origin);
  const created = await call<Record<string, unknown>>("/api/v2/pass-template", { method: "POST", body });
  const templateId = String(((created.data ?? created) as Record<string, unknown>).identifier ?? "");
  steps.templateId = templateId;
  if (!templateId) return { ok: false, steps, response: created };
  const memberId = "3f9a12bc-1111-4222-8333-444455556666";
  const values = passValues(company, memberId, { stamps: 4, name: "Ana" }, origin);
  const pass = await call<Record<string, unknown>>("/api/v3/pass?async=false", {
    method: "POST",
    body: { data: { templateId, userProvidedId: `prueba.${Date.now()}`, barcodeValue: memberId, ...values } },
  });
  const data = (pass.data ?? pass) as Record<string, unknown>;
  steps.passId = data.identifier;
  steps.iPhoneUri = data.iPhoneUri;
  steps.downloadPage = data.downloadPage;
  return { ok: Boolean(data.identifier), steps };
}
