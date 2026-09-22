// Versión de la imagen de la tarjeta (?v=). Cambia con todo lo que se dibuja en ella: diseño, nombre, logo,
// texto de la tarjeta, premios e idioma. Así el celular y Google Wallet piden la imagen nueva y no usan la guardada.
// Se usa en el navegador y en el servidor.

type Source = {
  name?: unknown;
  logoUrl?: unknown;
  brandColor?: unknown;
  language?: unknown;
  walletCard?: { header?: unknown };
  loyalty?: { rewards?: unknown };
  cardDesign?: unknown;
};

// JSON con las claves ordenadas: Firestore no garantiza el orden de los campos.
const stable = (value: unknown): string =>
  Array.isArray(value)
    ? `[${value.map(stable).join(",")}]`
    : value && typeof value === "object"
      ? `{${Object.keys(value)
          .sort()
          .map((k) => `${JSON.stringify(k)}:${stable((value as Record<string, unknown>)[k])}`)
          .join(",")}}`
      : JSON.stringify(value ?? null);

export function cardImageVersion(c: Source) {
  const text = stable([c.cardDesign, c.name, c.logoUrl, c.brandColor, c.language, c.walletCard?.header, c.loyalty?.rewards]);
  let hash = 5381;
  for (let i = 0; i < text.length; i++) hash = ((hash * 33) ^ text.charCodeAt(i)) >>> 0;
  return hash.toString(36);
}
