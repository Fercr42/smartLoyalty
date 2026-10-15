import { describe, expect, it } from "vitest";
import { formatColones } from "../../app/lib/format-money";
import { RECEIPT, sinpeReference } from "../../app/lib/sinpe";

describe("pago por SINPE Móvil", () => {
  it("muestra colones con punto de miles", () => {
    expect(formatColones(35900)).toBe("₡35.900");
    expect(formatColones(359000)).toBe("₡359.000");
    expect(formatColones(500)).toBe("₡500");
  });

  it("la referencia identifica al negocio sin datos personales", () => {
    expect(sinpeReference("abcDEF1234567890")).toBe("SL-ABCDEF");
  });

  it("acepta números de comprobante razonables", () => {
    expect(RECEIPT.test("2026101412345678")).toBe(true);
    expect(RECEIPT.test("12")).toBe(false);
    expect(RECEIPT.test("<script>")).toBe(false);
  });
});
