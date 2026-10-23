import { describe, expect, it } from "vitest";
import { passValues, passcreatorStrip, templateBody } from "../../app/lib/passcreator";
import { passcreatorReady } from "../../app/lib/passcreator-config";

const COMPANY = "abcDEF1234567890";
const MEMBER = "3f9a12bc-1111-4222-8333-444455556666";
const ORIGIN = "https://smartloyalty.app";

const company = {
  id: COMPANY,
  name: "Café Aroma",
  brandColor: "#0e7c66",
  logoUrl: "https://example.com/logo.png",
  description: "Café de especialidad",
  loyalty: { rewards: [{ id: "r1", title: "Café gratis", stamps: 500 }], mode: "points" },
  reviews: { enabled: true },
  location: { lat: 9.93, lng: -84.08 },
  walletCard: { links: [{ label: "WhatsApp", url: "https://wa.me/50688887777" }] },
};

describe("Passcreator: plantilla del negocio", () => {
  const body = templateBody(company, ORIGIN, "pass.com.passcreator.test");

  it("es una store card con el diseño del negocio", () => {
    expect(body.type).toBe("storeCard");
    expect(body.passTypeId).toBe("pass.com.passcreator.test");
    expect(body.organizationName).toBe("Café Aroma");
    expect(body.colors.backgroundColor).toBe("#0e7c66");
    expect(body.images.icon).toBe("https://example.com/logo.png");
    expect(body.images.logo).toBe("https://example.com/logo.png");
    expect(body.locations[0]).toMatchObject({ latitude: "9.93", longitude: "-84.08" });
  });

  it("los datos de cada cliente van en {campos}", () => {
    expect(body.fields.headerFields[0].value).toBe("{balance}");
    expect(body.fields.secondaryFields[0].value).toBe("{member}");
    expect(body.fields.auxiliaryFields[0].value).toBe("{reward}");
    const back = body.fields.backFields.map((f) => f.value);
    expect(back).toContain("{promo}");
    expect(back).toContain("{review}");
    expect(back).toContain("{code}");
    expect(back).toContain("https://wa.me/50688887777");
    expect(body.additionalProperties.map((p) => p.name)).toEqual(["balance", "member", "reward", "promo", "review", "code"]);
    expect(body.barcode.valueDifferentForEachPass).toBe(true);
  });

  it("la promo nueva avisa en el iPhone", () => {
    expect(body.fields.backFields[0]).toMatchObject({ value: "{promo}", changeMessage: "%@" });
  });

  it("sin logo usa el ícono de Smart Loyalty y oculta el logo", () => {
    const plain = templateBody({ ...company, logoUrl: "" }, ORIGIN, "pass.x");
    expect(plain.images.icon).toBe(`${ORIGIN}/icon.png`);
    expect(plain.images.logoHidden).toBe(true);
  });
});

describe("Passcreator: valores del cliente", () => {
  it("toma puntos, nombre, premio, encuesta y código del pase de siempre", () => {
    const v = passValues(company, MEMBER, { stamps: 120, name: "Ana", applePromo: { title: "2x1", body: "Hoy", at: 1 } }, ORIGIN);
    expect(v.balance).toContain("120");
    expect(v.member).toBe("Ana");
    expect(v.reward).toBeTruthy();
    expect(v.promo).toContain("2x1");
    expect(v.review).toBe(`${ORIGIN}/encuesta/${COMPANY}?m=${MEMBER}`);
    expect(v.code).toBe(MEMBER.slice(0, 8).toUpperCase());
  });
});

describe("Passcreator: configuración", () => {
  it("necesita la clave y la plantilla base", () => {
    const before = { ...process.env };
    process.env.PASSCREATOR_API_KEY = "k";
    delete process.env.PASSCREATOR_TEMPLATE_ID;
    expect(passcreatorReady()).toBe(false);
    process.env.PASSCREATOR_TEMPLATE_ID = "t";
    expect(passcreatorReady()).toBe(true);
    process.env = before;
  });
});

describe("Passcreator: franja", () => {
  it("usa la portada si el dueño subió una", () => {
    expect(passcreatorStrip({ ...company, walletCard: { heroUrl: "https://example.com/portada.jpg" } }, ORIGIN)).toBe("https://example.com/portada.jpg");
  });
  it("con el diseño de marca usa solo el fondo, sin puntos", () => {
    const strip = passcreatorStrip({ ...company, cardDesign: { useInWallet: true } }, ORIGIN);
    expect(strip).toContain("variant=strip");
    expect(strip).not.toContain("s=");
  });
  it("sin portada ni diseño no hay franja", () => {
    expect(passcreatorStrip(company, ORIGIN)).toBe("");
  });
});
