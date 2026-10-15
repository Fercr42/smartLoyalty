import { describe, expect, it } from "vitest";
import { roi } from "../../app/lib/roi";

describe("calculadora de la página principal", () => {
  it("calcula ganancia, no ventas, y resta el plan", () => {
    // 150 clientes × 4,3 semanas × 5 % = 32 visitas; × ₡6.000 = ₡192.000 en ventas; 30 % = ₡57.600.
    const r = roi({ customers: 150, ticket: 6000, returning: 5, margin: 30, planLocal: 46000 });
    expect(r.visits).toBe(32);
    expect(r.sales).toBe(192_000);
    expect(r.profit).toBe(57_600);
    expect(r.net).toBe(11_600);
    expect(r.breakEven).toBe(26); // ₡46.000 / ₡1.800 de ganancia por visita
  });

  it("sin margen no hay forma de pagar el plan", () => {
    expect(roi({ customers: 100, ticket: 5000, returning: 5, margin: 0, planLocal: 1000 }).breakEven).toBe(Infinity);
  });
});
