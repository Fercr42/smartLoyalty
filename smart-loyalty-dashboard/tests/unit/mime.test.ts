import { describe, expect, it } from "vitest";
import { emailText } from "../../app/lib/mime";

const base64 = Buffer.from("Hola, necesito ayuda con el escáner.\n¡Gracias!", "utf8").toString("base64");

describe("texto de un correo", () => {
  it("decodifica base64 en un correo simple", () => {
    const raw = ["Subject: Ayuda", "Content-Type: text/plain; charset=UTF-8", "Content-Transfer-Encoding: base64", "", base64].join("\r\n");
    expect(emailText(raw)).toBe("Hola, necesito ayuda con el escáner.\n¡Gracias!");
  });

  it("decodifica quoted-printable", () => {
    const raw = [
      "Content-Type: text/plain; charset=UTF-8",
      "Content-Transfer-Encoding: quoted-printable",
      "",
      "Caf=C3=A9 gratis con 400 puntos",
    ].join("\r\n");
    expect(emailText(raw)).toBe("Café gratis con 400 puntos");
  });

  it("elige el texto plano en un correo con varias partes", () => {
    const raw = [
      'Content-Type: multipart/alternative; boundary="abc"',
      "",
      "--abc",
      "Content-Type: text/plain; charset=UTF-8",
      "",
      "Mi escáner no abre",
      "--abc",
      "Content-Type: text/html; charset=UTF-8",
      "",
      "<p>Mi escáner no abre</p>",
      "--abc--",
    ].join("\r\n");
    expect(emailText(raw)).toBe("Mi escáner no abre");
  });

  it("usa el HTML cuando no hay texto plano", () => {
    const raw = [
      'Content-Type: multipart/alternative; boundary="xyz"',
      "",
      "--xyz",
      "Content-Type: text/html; charset=UTF-8",
      "",
      "<div>Hola<br>quiero probar</div>",
      "--xyz--",
    ].join("\r\n");
    expect(emailText(raw)).toBe("Hola\nquiero probar");
  });
});
