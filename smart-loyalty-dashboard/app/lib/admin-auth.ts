import { adminAuth } from "../firebase/admin";

// Acceso al administrador de Smart Loyalty: solo los correos de ADMIN_EMAILS (verificados).
export async function requireAdmin(req: Request): Promise<{ uid: string; email: string } | Response> {
  const idToken = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!idToken) return Response.json({ error: "No autorizado" }, { status: 401 });
  try {
    const decoded = await adminAuth().verifyIdToken(idToken);
    const allowed = (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    if (!decoded.email || !decoded.email_verified || !allowed.includes(decoded.email.toLowerCase())) {
      return Response.json({ error: "Tu cuenta no tiene acceso al administrador." }, { status: 403 });
    }
    return { uid: decoded.uid, email: decoded.email };
  } catch {
    return Response.json({ error: "Sesión inválida" }, { status: 401 });
  }
}
