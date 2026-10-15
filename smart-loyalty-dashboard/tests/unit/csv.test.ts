import { describe, expect, it } from "vitest";
import { cell } from "../../app/lib/csv";

describe("exportación de clientes (CSV)", () => {
  it("neutraliza fórmulas de Excel en los textos", () => {
    expect(cell('=HYPERLINK("https://x","premio")')).toBe(`"'=HYPERLINK(""https://x"",""premio"")"`);
    expect(cell("+50688887777")).toBe("'+50688887777");
    expect(cell("@luis")).toBe("'@luis");
  });

  it("deja igual los textos y números normales", () => {
    expect(cell("Ana María")).toBe("Ana María");
    expect(cell(-5)).toBe("-5");
    expect(cell("Pérez; Luis")).toBe('"Pérez; Luis"');
  });
});
