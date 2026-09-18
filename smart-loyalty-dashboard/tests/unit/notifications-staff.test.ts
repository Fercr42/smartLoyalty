import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { InputError, parseNotificationInput } from "../../app/lib/send-notification";
import { checkPin, hashPin, readStaffToken, signStaffToken } from "../../app/lib/staff-auth";

describe("validación de notificaciones", () => {
  const base = { type: "promo", title: "2x1 hoy", body: "Solo hoy" };

  it("acepta una notificación simple con grupo 'todos'", () => {
    const input = parseNotificationInput(base);
    expect(input).toMatchObject({ type: "promo", title: "2x1 hoy", audience: "all", ctaLabel: "", ctaUrl: "" });
  });

  it("botón con enlace sin texto queda vacío (la página muestra 'Ver más' en su idioma); grupo desconocido cae a 'todos'", () => {
    const input = parseNotificationInput({ ...base, ctaUrl: "https://ejemplo.com", audience: "vip" });
    expect(input.ctaLabel).toBe("");
    expect(input.audience).toBe("all");
  });

  it("rechaza datos inválidos", () => {
    expect(() => parseNotificationInput({ ...base, type: "spam" })).toThrow(InputError);
    expect(() => parseNotificationInput({ ...base, title: "x".repeat(66) })).toThrow(InputError);
    expect(() => parseNotificationInput({ ...base, ctaUrl: "http://inseguro.com" })).toThrow(InputError);
    expect(() =>
      parseNotificationInput({ ...base, coupon: { title: "10%", expiresAt: Date.now() - 1000, expiresDate: "2020-01-01" } })
    ).toThrow(InputError);
    expect(() => parseNotificationInput({ ...base, sendAt: Date.now() - 5 * 60_000 })).toThrow(InputError);
  });

  it("programación con repetición inválida queda como una sola vez", () => {
    const input = parseNotificationInput({ ...base, sendAt: Date.now() + 3_600_000, repeat: "cada-hora" });
    expect(input.schedule?.repeat).toBe("none");
  });
});

describe("acceso de empleados", () => {
  beforeAll(() => {
    process.env.FIREBASE_SERVICE_ACCOUNT = JSON.stringify({ test: "llave-de-prueba" });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("verifica el PIN sin guardarlo en texto", () => {
    const stored = hashPin("4321");
    expect(stored.pinHash).not.toContain("4321");
    expect(checkPin("4321", stored)).toBe(true);
    expect(checkPin("0000", stored)).toBe(false);
    expect(checkPin("4321", {})).toBe(false);
  });

  it("la sesión firmada no se puede alterar", () => {
    const token = signStaffToken("restaurante1", 7);
    expect(readStaffToken(token)).toMatchObject({ c: "restaurante1", v: 7 });
    const [payload, signature] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ c: "otro", v: 7, exp: Date.now() + 1e9 })).toString("base64url");
    expect(readStaffToken(`${forged}.${signature}`)).toBeNull();
    expect(readStaffToken(`${payload}.firma-falsa`)).toBeNull();
  });

  it("la sesión vence a las 12 horas", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-14T08:00:00Z"));
    const token = signStaffToken("restaurante1", 1);
    vi.setSystemTime(new Date("2026-09-14T21:00:00Z"));
    expect(readStaffToken(token)).toBeNull();
  });
});
