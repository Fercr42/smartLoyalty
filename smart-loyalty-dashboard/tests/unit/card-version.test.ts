import { describe, expect, it } from "vitest";
import { cardImageVersion } from "../../app/lib/card-version";

const base = {
  name: "Rancho",
  logoUrl: "/logo.png",
  walletCard: { header: "Cliente frecuente" },
  loyalty: { rewards: [{ id: "a", title: "Birra", stamps: 500 }] },
  cardDesign: { font: "poppins", version: 1 },
};

describe("versión de la imagen de la tarjeta", () => {
  it("no depende del orden de los campos", () => {
    const reordered = { ...base, cardDesign: { version: 1, font: "poppins" } };
    expect(cardImageVersion(reordered)).toBe(cardImageVersion(base));
  });

  it("cambia con el nombre, el texto, los premios, el logo y el diseño", () => {
    const v = cardImageVersion(base);
    expect(cardImageVersion({ ...base, name: "Rancho 2" })).not.toBe(v);
    expect(cardImageVersion({ ...base, walletCard: { header: "VIP" } })).not.toBe(v);
    expect(cardImageVersion({ ...base, loyalty: { rewards: [] } })).not.toBe(v);
    expect(cardImageVersion({ ...base, logoUrl: "/otro.png" })).not.toBe(v);
    expect(cardImageVersion({ ...base, cardDesign: { font: "poppins", version: 2 } })).not.toBe(v);
  });
});
