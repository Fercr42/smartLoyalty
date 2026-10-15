import { describe, expect, it } from "vitest";
import { companyIdFromQr, isNativeApp } from "../../app/lib/native";

describe("app de negocios", () => {
  it("saca el negocio del QR del mostrador o del código escrito", () => {
    expect(companyIdFromQr("https://smartloyalty.app/join/abcDEF1234567890")).toBe("abcDEF1234567890");
    expect(companyIdFromQr("https://smartloyalty.app/join/abcDEF1234567890?m=123")).toBe("abcDEF1234567890");
    expect(companyIdFromQr("https://smartloyalty.app/scan/abcDEF1234567890")).toBe("abcDEF1234567890");
    expect(companyIdFromQr("  abcDEF1234567890 ")).toBe("abcDEF1234567890");
    expect(companyIdFromQr("3f9a12bc-1111-4222-8333-444455556666")).toBeNull(); // tarjeta de cliente, no negocio
    expect(companyIdFromQr("https://otro.com")).toBeNull();
  });

  it("fuera de la app no hay funciones nativas", () => {
    expect(isNativeApp()).toBe(false);
  });
});
