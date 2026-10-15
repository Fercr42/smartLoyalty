import { describe, expect, it } from "vitest";
import { dataImageResponse } from "../../app/lib/data-image";

const b64 = (text: string) => Buffer.from(text).toString("base64");

describe("imágenes guardadas como data URL", () => {
  it("sirve PNG con nosniff", () => {
    const res = dataImageResponse(`data:image/png;base64,${b64("png")}`, "Sin logo");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("rechaza SVG (podría traer código) y datos vacíos", () => {
    expect(dataImageResponse(`data:image/svg+xml;base64,${b64("<svg><script>alert(1)</script></svg>")}`, "x").status).toBe(415);
    expect(dataImageResponse("", "Sin logo").status).toBe(404);
    expect(dataImageResponse(undefined, "Sin logo").status).toBe(404);
  });
});
