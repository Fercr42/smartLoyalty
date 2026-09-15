import { describe, expect, it } from "vitest";
import { describeLink } from "../../app/lib/links";
import { parseMapsLink, validLocation } from "../../app/lib/location";

describe("parseMapsLink", () => {
  it("prefiere el pin exacto del lugar (!3d/!4d) sobre el centro del mapa", () => {
    const url = "https://www.google.com/maps/place/Rancho/@9.9281,-84.0907,17z/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d9.93!4d-84.09";
    expect(parseMapsLink(url)).toEqual({ lat: 9.93, lng: -84.09 });
  });

  it("lee ?q=lat,lng y coordenadas escritas a mano", () => {
    expect(parseMapsLink("https://maps.google.com/?q=9.9,-84.1")).toEqual({ lat: 9.9, lng: -84.1 });
    expect(parseMapsLink(" 9.93, -84.09 ")).toEqual({ lat: 9.93, lng: -84.09 });
  });

  it("no inventa coordenadas en enlaces cortos", () => {
    expect(parseMapsLink("https://maps.app.goo.gl/abc123")).toBeNull();
  });
});

describe("validLocation", () => {
  it("rechaza 0,0 y valores fuera de rango", () => {
    expect(validLocation({ lat: 0, lng: 0 })).toBeNull();
    expect(validLocation({ lat: 95, lng: 10 })).toBeNull();
    expect(validLocation(null)).toBeNull();
  });

  it("convierte textos a números", () => {
    expect(validLocation({ lat: "9.9", lng: "-84" })).toEqual({ lat: 9.9, lng: -84 });
  });
});

describe("describeLink", () => {
  it("sin texto muestra el dato del enlace", () => {
    expect(describeLink("", "https://fercr42.github.io/rancho-potrillos/")).toBe("fercr42.github.io/rancho-potrillos");
    expect(describeLink("", "https://wa.me/50672511471")).toBe("WhatsApp: +50672511471");
    expect(describeLink("", "tel:+50672511471")).toBe("Llamar: +50672511471");
    expect(describeLink("", "mailto:hola@rancho.com")).toBe("Correo: hola@rancho.com");
    expect(describeLink("", "https://instagram.com/ranchopotrillos")).toBe("Instagram: @ranchopotrillos");
  });

  it("con texto agrega número o correo, pero no la dirección web", () => {
    expect(describeLink("Pedidos", "https://wa.me/50672511471")).toBe("Pedidos: +50672511471");
    expect(describeLink("Ver menú", "https://fercr42.github.io/rancho-potrillos/")).toBe("Ver menú");
  });
});
