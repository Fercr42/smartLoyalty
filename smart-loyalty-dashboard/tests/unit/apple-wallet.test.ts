import { describe, expect, it } from "vitest";
import forge from "node-forge";
import {
  appleConfig,
  packPass,
  parseSerial,
  newPassAuthToken,
  passJson,
  passSerial,
  readPem,
  validPassAuth,
  type AppleConfig,
} from "../../app/lib/apple-wallet";

const COMPANY = "abcDEF1234567890";
const MEMBER = "3f9a12bc-1111-4222-8333-444455556666";
const TOKEN = "token-de-pruebas-de-la-tarjeta";
const CONFIG = { passTypeId: "pass.com.smartloyalty.test", teamId: "ABCDE12345" };

// Certificados de mentira (autofirmados) para probar la firma sin la cuenta de Apple.
function fakeCertificates() {
  const make = (cn: string, issuer?: { cert: forge.pki.Certificate; key: forge.pki.rsa.PrivateKey }) => {
    const keys = forge.pki.rsa.generateKeyPair(1024);
    const cert = forge.pki.createCertificate();
    cert.publicKey = keys.publicKey;
    cert.serialNumber = String(Math.floor(Math.random() * 1e9));
    cert.validity.notBefore = new Date(Date.now() - 86_400_000);
    cert.validity.notAfter = new Date(Date.now() + 86_400_000);
    cert.setSubject([{ name: "commonName", value: cn }]);
    cert.setIssuer(issuer ? issuer.cert.subject.attributes : [{ name: "commonName", value: cn }]);
    cert.sign(issuer ? issuer.key : keys.privateKey, forge.md.sha256.create());
    return { cert, key: keys.privateKey };
  };
  const wwdr = make("WWDR de prueba");
  const signer = make("Pase de prueba", wwdr);
  return {
    wwdr: forge.pki.certificateToPem(wwdr.cert),
    signerCert: forge.pki.certificateToPem(signer.cert),
    signerKey: forge.pki.privateKeyToPem(signer.key),
  };
}

const company = {
  id: COMPANY,
  name: "Café Aroma",
  brandColor: "#0e7c66",
  description: "Café de especialidad",
  loyalty: { rewards: [{ id: "r1", title: "Café gratis", stamps: 500 }], mode: "points" },
  reviews: { enabled: true },
  location: { lat: 9.93, lng: -84.08 },
  walletCard: { links: [{ label: "WhatsApp", url: "https://wa.me/50688887777" }, { label: "Malo", url: "javascript:alert(1)" }] },
};

describe("Apple Wallet: configuración", () => {
  it("lee PEM con \\n como texto o en base64", () => {
    const pem = "-----BEGIN CERTIFICATE-----\nABC\n-----END CERTIFICATE-----";
    expect(readPem(pem.replace(/\n/g, "\\n"))).toBe(pem);
    expect(readPem(Buffer.from(pem).toString("base64"))).toBe(pem);
    expect(readPem("no es un certificado")).toBe("");
    expect(readPem(undefined)).toBe("");
  });

  it("solo se activa con todas las variables y un secreto largo", () => {
    const pem = "-----BEGIN X-----\\nA\\n-----END X-----";
    const env = {
      APPLE_WALLET_PASS_TYPE_ID: "pass.x",
      APPLE_WALLET_TEAM_ID: "T",
      APPLE_WALLET_CERT: pem,
      APPLE_WALLET_KEY: pem,
      APPLE_WALLET_WWDR: pem,
    };
    expect(appleConfig(env)).not.toBeNull();
    expect(appleConfig({ ...env, APPLE_WALLET_WWDR: "" })).toBeNull();
    expect(appleConfig({ ...env, APPLE_WALLET_TEAM_ID: " " })).toBeNull();
  });
});

describe("Apple Wallet: número de serie y token", () => {
  it("arma y lee el número de serie", () => {
    expect(parseSerial(passSerial(COMPANY, MEMBER))).toEqual({ companyId: COMPANY, memberId: MEMBER });
    expect(parseSerial(`${COMPANY}.no-es-uuid`)).toBeNull();
    expect(parseSerial(`${COMPANY}.${MEMBER}.extra`)).toBeNull();
    expect(parseSerial("../../x")).toBeNull();
  });

  it("cada tarjeta tiene un token aleatorio y solo se acepta ese", () => {
    const token = newPassAuthToken();
    expect(token.length).toBeGreaterThanOrEqual(16);
    expect(newPassAuthToken()).not.toBe(token);
    expect(validPassAuth(`ApplePass ${token}`, token)).toBe(true);
    expect(validPassAuth(`ApplePass ${token}`, newPassAuthToken())).toBe(false);
    expect(validPassAuth(`ApplePass ${token}`, undefined)).toBe(false); // tarjeta sin pase todavía
    expect(validPassAuth(null, token)).toBe(false);
  });
});

describe("Apple Wallet: contenido del pase", () => {
  const json = passJson({
    company,
    memberId: MEMBER,
    member: { stamps: 120, name: "Luis", applePromo: { title: "2x1 hoy", body: "Solo hasta las 6", at: 2 } },
    origin: "https://smartloyalty.app",
    config: CONFIG,
    authToken: TOKEN,
  });

  it("lleva el QR, el servicio web y los colores de la marca", () => {
    expect(json.serialNumber).toBe(passSerial(COMPANY, MEMBER));
    expect(json.authenticationToken).toBe(TOKEN);
    expect(json.webServiceURL).toBe("https://smartloyalty.app/api/wallet/apple");
    expect(json.barcodes[0]).toMatchObject({ format: "PKBarcodeFormatQR", message: MEMBER, altText: "3F9A12BC" });
    expect(json.backgroundColor).toBe("rgb(14, 124, 102)");
    expect(json.locations?.[0]).toMatchObject({ latitude: 9.93, longitude: -84.08 });
  });

  it("muestra puntos, nombre, próximo premio y avisa cuando cambian", () => {
    expect(json.storeCard.headerFields[0]).toMatchObject({ key: "balance", changeMessage: "Ahora tienes %@" });
    expect(json.storeCard.secondaryFields[0].value).toBe("Luis");
    expect(json.storeCard.auxiliaryFields[0]).toMatchObject({ key: "next_reward", changeMessage: "%@" });
  });

  it("pone la promo, la encuesta y solo enlaces seguros en el reverso", () => {
    const back = json.storeCard.backFields;
    expect(back[0]).toMatchObject({ key: "promo", changeMessage: "%@" });
    expect(back[0].value).toContain("2x1 hoy");
    expect(back.find((f) => f.key === "review")?.value).toBe(`https://smartloyalty.app/encuesta/${COMPANY}?m=${MEMBER}`);
    expect(back.some((f) => f.value.includes("javascript:"))).toBe(false);
    expect(back.find((f) => f.key === "link_0")?.value).toBe("https://wa.me/50688887777");
  });

  it("usa la promo más reciente (la de todos o la del cliente)", () => {
    const newer = passJson({
      company: { ...company, appleWalletPromo: { title: "Para todos", body: "", at: 5 } },
      memberId: MEMBER,
      member: { applePromo: { title: "Solo para ti", at: 2 } },
      origin: "https://smartloyalty.app",
      config: CONFIG,
      authToken: TOKEN,
    });
    expect(newer.storeCard.backFields[0].value).toContain("Para todos");
  });

  it("sin HTTPS no pone servicio web ni enlaces a la página", () => {
    const local = passJson({ company, memberId: MEMBER, member: {}, origin: "http://localhost:3000", config: CONFIG, authToken: TOKEN });
    expect(local.webServiceURL).toBeUndefined();
    expect(local.storeCard.backFields.some((f) => f.key === "review" || f.key === "promos")).toBe(false);
  });
});

describe("Apple Wallet: firma", () => {
  it("empaqueta un .pkpass firmado con pass.json, manifest y firma", () => {
    const certs = fakeCertificates();
    const config: AppleConfig = { ...CONFIG, ...certs };
    const json = passJson({ company, memberId: MEMBER, member: { stamps: 10 }, origin: "https://smartloyalty.app", config, authToken: TOKEN });
    // PNG de 1x1 para el ícono (Apple lo exige).
    const icon = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
      "base64"
    );
    const buffer = packPass(json, { "icon.png": icon }, config);
    expect(buffer.subarray(0, 2).toString()).toBe("PK"); // es un zip
    const text = buffer.toString("latin1");
    for (const file of ["pass.json", "icon.png", "manifest.json", "signature"]) expect(text).toContain(file);
  }, 30_000);
});
