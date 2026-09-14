import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";

// Acceso de empleados al escáner: un PIN por restaurante y una sesión firmada de 12 horas.

const SESSION_HOURS = 12;

// La llave de sesión se deriva de la cuenta de servicio: no hace falta otra variable secreta.
const secret = () =>
  createHash("sha256").update(`staff-session:${process.env.FIREBASE_SERVICE_ACCOUNT ?? ""}`).digest();

export function hashPin(pin: string) {
  const salt = randomBytes(16).toString("hex");
  return { salt, pinHash: scryptSync(pin, salt, 32).toString("hex") };
}

export function checkPin(pin: string, stored: { salt?: string; pinHash?: string }) {
  if (!stored.salt || !stored.pinHash) return false;
  const given = scryptSync(pin, stored.salt, 32);
  const expected = Buffer.from(stored.pinHash, "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export function signStaffToken(companyId: string, pinVersion: number) {
  const payload = Buffer.from(
    JSON.stringify({ c: companyId, v: pinVersion, exp: Date.now() + SESSION_HOURS * 3_600_000 })
  ).toString("base64url");
  return `${payload}.${createHmac("sha256", secret()).update(payload).digest("base64url")}`;
}

export function readStaffToken(token: string): { c: string; v: number; exp: number } | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = createHmac("sha256", secret()).update(payload).digest();
  const given = Buffer.from(signature, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    return data.exp > Date.now() ? data : null;
  } catch {
    return null;
  }
}
