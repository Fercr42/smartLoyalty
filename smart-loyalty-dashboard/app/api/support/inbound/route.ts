import { NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "../../../firebase/admin";
import { emailText } from "../../../lib/mime";
import { cleanName } from "../../../lib/member-name";

export const runtime = "nodejs";

// Correos que llegan a soporte@smartloyalty.app: los reenvía el Worker de Cloudflare
// (cloudflare/email-worker.js) para que queden en la bandeja del administrador.
export async function POST(req: NextRequest) {
  const secret = process.env.INBOUND_EMAIL_SECRET;
  if (!secret || req.headers.get("x-inbound-secret") !== secret) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const email = String(body.from ?? "").trim().toLowerCase().slice(0, 120);
  const subject = String(body.subject ?? "").trim().slice(0, 200);
  // El Worker manda el correo crudo; si no, se usa el texto que haya mandado.
  const raw = String(body.raw ?? "");
  const text = (raw ? emailText(raw) : String(body.text ?? "")).trim().slice(0, 8000);
  if (!email.includes("@")) return Response.json({ error: "Remitente inválido" }, { status: 400 });

  await adminDb().collection("supportTickets").add({
    email,
    name: cleanName(body.name).slice(0, 80),
    business: "",
    subject,
    message: text || subject || "(sin texto)",
    origen: "correo",
    status: "nuevo",
    at: FieldValue.serverTimestamp(),
  });
  return Response.json({ ok: true });
}
