import { connect } from "http2";
import { FieldValue, type DocumentReference } from "firebase-admin/firestore";
import { adminDb } from "../firebase/admin";
import { appleConfig, parseSerial, passJson, packPass, passSerial, type AppleCompany, type AppleMember } from "./apple-wallet";
import { renderPassImages } from "./apple-pass-images";

// Registros de iPhones que guardaron un pase y avisos por APNs para que pidan la versión nueva.
// appleWalletRegistrations/{deviceId}_{serial}: { deviceId, serial, companyId, memberId, pushToken, passUpdatedAt }

const REGISTRATIONS = "appleWalletRegistrations";
export const PUSH_TOKEN = /^[0-9a-f]{32,200}$/i;
export const DEVICE_ID = /^[A-Za-z0-9_-]{1,128}$/;

const registrations = () => adminDb().collection(REGISTRATIONS);
const registrationId = (deviceId: string, serial: string) => `${deviceId}_${serial}`;

// El iPhone guardó el pase. true si es un registro nuevo (Apple espera 201) o false si ya existía (200).
export async function registerDevice(deviceId: string, serial: string, pushToken: string) {
  const parsed = parseSerial(serial);
  if (!parsed) return null;
  const ref = registrations().doc(registrationId(deviceId, serial));
  const existing = await ref.get();
  await ref.set(
    {
      deviceId,
      serial,
      companyId: parsed.companyId,
      memberId: parsed.memberId,
      pushToken,
      passUpdatedAt: existing.data()?.passUpdatedAt ?? Date.now(),
      registeredAt: existing.data()?.registeredAt ?? FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  // El cliente tiene el pase de verdad: cuenta como "Wallet" en el panel y para los avisos.
  await adminDb()
    .collection("companies")
    .doc(parsed.companyId)
    .collection("walletMembers")
    .doc(parsed.memberId)
    .set({ appleWallet: true, appleWalletAt: FieldValue.serverTimestamp() }, { merge: true })
    .catch((e) => console.error("Apple Wallet registro", e));
  return !existing.exists;
}

// El cliente borró el pase de ese iPhone.
export async function unregisterDevice(deviceId: string, serial: string) {
  const parsed = parseSerial(serial);
  if (!parsed) return;
  await registrations().doc(registrationId(deviceId, serial)).delete();
  const left = await registrations().where("serial", "==", serial).limit(1).get();
  if (left.empty) {
    await adminDb()
      .collection("companies")
      .doc(parsed.companyId)
      .collection("walletMembers")
      .doc(parsed.memberId)
      .update({ appleWallet: false })
      .catch(() => {}); // la tarjeta ya no existe
  }
}

// Pases de ese iPhone que cambiaron después de "since" (la marca que le dimos la vez anterior).
export async function updatedSerials(deviceId: string, since?: string | null) {
  const snap = await registrations().where("deviceId", "==", deviceId).get();
  const after = Number(since) || 0;
  const changed = snap.docs.map((d) => d.data()).filter((r) => (r.passUpdatedAt ?? 0) > after);
  if (!changed.length) return null;
  return {
    serialNumbers: [...new Set(changed.map((r) => r.serial as string))],
    lastUpdated: String(Math.max(...changed.map((r) => r.passUpdatedAt ?? 0))),
  };
}

// ¿Este cliente tiene su pase guardado en algún iPhone?
export async function applePassSaved(companyId: string, memberId: string) {
  if (!appleConfig()) return false;
  const snap = await registrations().where("serial", "==", passSerial(companyId, memberId)).limit(1).get();
  return !snap.empty;
}

// Arma el .pkpass del cliente con sus datos actuales. Las tarjetas unidas a otra muestran la principal.
export async function buildMemberPass(companyId: string, memberId: string, origin: string) {
  const config = appleConfig();
  if (!config) throw new Error("Apple Wallet no está configurado");
  const companyRef = adminDb().collection("companies").doc(companyId);
  const [company, member] = await Promise.all([companyRef.get(), companyRef.collection("walletMembers").doc(memberId).get()]);
  if (!company.exists) return null;
  let data = (member.data() ?? {}) as AppleMember & { mergedInto?: string };
  if (data.mergedInto) {
    const main = await companyRef.collection("walletMembers").doc(data.mergedInto).get();
    if (main.exists) data = { ...(main.data() as AppleMember), applePromo: data.applePromo ?? main.data()?.applePromo };
  }
  const companyData = { ...company.data(), id: companyId } as AppleCompany;
  const json = passJson({ company: companyData, memberId, member: data, origin, config });
  const images = await renderPassImages(companyData, origin, data.stamps ?? 0);
  return packPass(json, images, config);
}

// Aviso vacío a APNs: el iPhone pregunta qué pases cambiaron y los descarga. Devuelve los tokens muertos.
async function pushToDevices(tokens: string[]) {
  const config = appleConfig();
  if (!config || !tokens.length) return [];
  const session = connect("https://api.push.apple.com:443", {
    cert: config.signerCert,
    key: config.signerKey,
    passphrase: config.passphrase,
  });
  const dead: string[] = [];
  try {
    await new Promise<void>((resolve, reject) => {
      session.once("connect", () => resolve());
      session.once("error", reject);
    });
    for (let i = 0; i < tokens.length; i += 50) {
      await Promise.all(
        tokens.slice(i, i + 50).map(
          (token) =>
            new Promise<void>((resolve) => {
              const req = session.request({
                ":method": "POST",
                ":path": `/3/device/${token}`,
                "apns-topic": config.passTypeId,
                "content-type": "application/json",
              });
              let body = "";
              req.setEncoding("utf8");
              req.on("data", (chunk) => (body += chunk));
              req.on("response", (headers) => {
                req.on("end", () => {
                  const status = Number(headers[":status"]);
                  if (status === 410 || (status === 400 && body.includes("BadDeviceToken"))) dead.push(token);
                  else if (status !== 200) console.error("APNs", status, body);
                  resolve();
                });
              });
              req.on("error", (e) => {
                console.error("APNs", e);
                resolve();
              });
              req.setTimeout(10_000, () => {
                req.close();
                resolve();
              });
              req.end("{}");
            })
        )
      );
    }
  } finally {
    session.close();
  }
  return dead;
}

// Las tarjetas que otras unieron a estas (el cliente protegió su tarjeta con su correo) también se actualizan.
async function withMerged(companyRef: DocumentReference, memberIds: string[]) {
  const all = new Set(memberIds);
  for (let i = 0; i < memberIds.length; i += 30) {
    const merged = await companyRef.collection("walletMembers").where("mergedInto", "in", memberIds.slice(i, i + 30)).select().get();
    merged.docs.forEach((d) => all.add(d.id));
  }
  return [...all];
}

// Algo cambió (puntos, nombre, diseño, promo): marcar los pases y avisar a los iPhones.
// memberIds null = todos los pases del negocio. Devuelve cuántos iPhones avisó.
export async function refreshApplePasses(companyId: string, memberIds: string[] | null) {
  if (!appleConfig()) return 0;
  const db = adminDb();
  let docs;
  if (memberIds) {
    if (!memberIds.length) return 0;
    const ids = await withMerged(db.collection("companies").doc(companyId), memberIds);
    const serials = ids.map((id) => passSerial(companyId, id));
    docs = [];
    for (let i = 0; i < serials.length; i += 30) {
      docs.push(...(await registrations().where("serial", "in", serials.slice(i, i + 30)).get()).docs);
    }
  } else {
    docs = (await registrations().where("companyId", "==", companyId).get()).docs;
  }
  if (!docs.length) return 0;

  const now = Date.now();
  for (let i = 0; i < docs.length; i += 500) {
    const batch = db.batch();
    docs.slice(i, i + 500).forEach((d) => batch.update(d.ref, { passUpdatedAt: now }));
    await batch.commit();
  }

  const tokens = [...new Set(docs.map((d) => d.data().pushToken as string).filter((t) => PUSH_TOKEN.test(t ?? "")))];
  const dead = new Set(await pushToDevices(tokens));
  if (dead.size) {
    // El iPhone ya no existe o borró el pase sin avisar.
    const batch = db.batch();
    docs.filter((d) => dead.has(d.data().pushToken)).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
  return tokens.length - dead.size;
}

// Clientes que tienen el pase de este negocio (para contar a quién le llegó una promo).
export async function appleHolders(companyId: string) {
  if (!appleConfig()) return [];
  const snap = await registrations().where("companyId", "==", companyId).select("memberId").get();
  return [...new Set(snap.docs.map((d) => d.data().memberId as string))];
}
