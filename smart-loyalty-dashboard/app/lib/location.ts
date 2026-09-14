// Ubicación del restaurante (para que Google Wallet muestre la tarjeta cerca del local).
// Se usa en el navegador y en el servidor.

export type LatLng = { lat: number; lng: number };

export function validLocation(raw: unknown): LatLng | null {
  if (!raw || typeof raw !== "object") return null;
  const { lat, lng } = raw as { lat?: unknown; lng?: unknown };
  const la = Number(lat);
  const ln = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(ln) || Math.abs(la) > 90 || Math.abs(ln) > 180) return null;
  if (la === 0 && ln === 0) return null;
  return { lat: la, lng: ln };
}

// Coordenadas desde un enlace de Google Maps o texto "9.93, -84.09".
export function parseMapsLink(text: string): LatLng | null {
  const num = "(-?\\d{1,3}(?:\\.\\d+)?)";
  const patterns = [
    new RegExp(`!3d${num}!4d${num}`), // pin exacto del lugar
    new RegExp(`@${num},${num}`), // centro del mapa
    new RegExp(`[?&](?:q|query|ll|destination)=${num},\\s*${num}`),
    new RegExp(`^\\s*${num},\\s*${num}\\s*$`),
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return validLocation({ lat: match[1], lng: match[2] });
  }
  return null;
}
