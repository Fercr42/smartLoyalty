import { describe, expect, it } from "vitest";
import { safeColor, textOn } from "../../app/lib/colors";
import { formatDay } from "../../app/lib/format";
import { addDaysYmd, isLeapYear, localParts, validTimezone } from "../../app/lib/time";

describe("fechas del restaurante", () => {
  it("suma días cruzando meses y años", () => {
    expect(addDaysYmd("2026-02-27", 2)).toBe("2026-03-01");
    expect(addDaysYmd("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("años bisiestos", () => {
    expect(isLeapYear(2024)).toBe(true);
    expect(isLeapYear(1900)).toBe(false);
    expect(isLeapYear(2000)).toBe(true);
  });

  it("usa la zona horaria del restaurante", () => {
    // 03:30 UTC del 14 = 21:30 del 13 en Costa Rica (UTC-6)
    const parts = localParts("America/Costa_Rica", new Date("2026-09-14T03:30:00Z"));
    expect(parts).toEqual({ ymd: "2026-09-13", mmdd: "09-13", year: 2026, hour: 21 });
  });

  it("zona inválida cae a UTC", () => {
    expect(validTimezone("Nope/Zone")).toBe("UTC");
    expect(validTimezone(undefined)).toBe("UTC");
  });

  it("formatea AAAA-MM-DD en español sin correrse de día", () => {
    expect(formatDay("2026-09-14")).toBe("14 de septiembre");
    expect(formatDay("no-es-fecha")).toBe("no-es-fecha");
  });
});

describe("colores", () => {
  it("solo acepta hexadecimales de 6 dígitos", () => {
    expect(safeColor("#ABCDEF", "#000000")).toBe("#ABCDEF");
    expect(safeColor("blue", "#000000")).toBe("#000000");
  });

  it("elige texto oscuro sobre fondos claros y blanco sobre oscuros", () => {
    expect(textOn("#ffffff")).toBe("#111827");
    expect(textOn("#000000")).toBe("#ffffff");
  });
});
