import { NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "../../firebase/admin";
import { adminEmails, sendEmail } from "../../lib/email";
import { cleanName } from "../../lib/member-name";

export const runtime = "nodejs";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_PER_HOUR = 5;

// Mensajes de soporte que escriben los dueños desde /soporte. Se leen en el panel de administrador.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase().slice(0, 120);
  const message = String(body.message ?? "").trim().slice(0, 4000);
  if (!EMAIL.test(email)) return Response.json({ error: "Ese correo no parece válido." }, { status: 400 });
  if (message.length < 5) return Response.json({ error: "Escribe tu mensaje." }, { status: 400 });

  const tickets = adminDb().collection("supportTickets");
  // Tope sencillo para que nadie llene la bandeja desde el mismo correo (sin índice compuesto).
  const mine = await tickets.where("email", "==", email).select("at").limit(50).get();
  const hourAgo = Date.now() - 3_600_000;
  const recent = mine.docs.filter((d) => (d.data().at?.toMillis?.() ?? 0) > hourAgo).length;
  if (recent >= MAX_PER_HOUR) {
    return Response.json({ error: "Ya recibimos varios mensajes tuyos. Te respondemos pronto." }, { status: 429 });
  }

  await tickets.add({
    email,
    message,
    name: cleanName(body.name).slice(0, 80),
    business: cleanName(body.business).slice(0, 80),
    locale: String(body.locale ?? "").slice(0, 5),
    userAgent: (req.headers.get("user-agent") ?? "").slice(0, 200),
    status: "nuevo",
    at: FieldValue.serverTimestamp(),
  });
  // Aviso al equipo, para no depender de entrar al administrador.
  // Las pruebas automáticas usan @example.com (dominio reservado): no se avisa por correo.
  const equipo = email.endsWith("@example.com") ? [] : adminEmails();
  if (equipo.length) {
    await sendEmail({
      to: equipo,
      replyTo: email,
      subject: `Soporte: ${cleanName(body.name) || email}`,
      text: `${message}

—
De: ${email}
Negocio: ${cleanName(body.business) || "(sin nombre)"}
Responder desde el administrador: https://smartloyalty.app/admin`,
    }).catch((e) => console.error("Aviso de soporte", e));
  }

  return Response.json({ ok: true });
}
