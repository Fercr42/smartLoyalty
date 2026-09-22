// Nombre que el cliente escribe en su tarjeta. Se usa en el navegador y en el servidor.

export const NAME_MAX = 40;

// Limpia espacios y caracteres raros; "" si no es un nombre (debe tener al menos una letra).
export function cleanName(value: unknown) {
  if (typeof value !== "string") return "";
  const name = value
    .replace(/[\x00-\x1f<>{}]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, NAME_MAX)
    .trim();
  return /\p{L}/u.test(name) ? name : "";
}
