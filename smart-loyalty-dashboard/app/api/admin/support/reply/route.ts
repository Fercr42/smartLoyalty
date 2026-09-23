import { NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "../../../../firebase/admin";
import { requireAdmin } from "../../../../lib/admin-auth";
import { emailReady, sendEmail, supportFrom } from "../../../../lib/email";

export const runtime = "nodejs";

// Responder un mensaje de soporte desde el administrador: sale por correo y queda guardado en el hilo.
export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof Response) return admin;
  if (!emailReady()) {
    return Response.json({ error: "Falta configurar el correo de salida (RESEND_API_KEY)." }, { status: 503 });
  }

  const body = await req.json().catch(() => ({}));
  const ticketId = String(body.ticketId ?? "");
  const message = String(body.message ?? "").trim().slice(0, 4000);
  if (!/^[A-Za-z0-9]{1,40}$/.test(ticketId)) return Response.json({ error: "Mensaje inválido" }, { status: 400 });
  if (message.length < 2) return Response.json({ error: "Escribe la respuesta." }, { status: 400 });

  const ref = adminDb().collection("supportTickets").doc(ticketId);
  const ticket = await ref.get();
  if (!ticket.exists) return Response.json({ error: "Mensaje no encontrado" }, { status: 404 });

  const to = ticket.data()?.email;
  if (typeof to !== "string" || !to.includes("@")) return Response.json({ error: "Ese mensaje no tiene correo" }, { status: 400 });

  const original = String(ticket.data()?.message ?? "");
  const result = await sendEmail({
    to,
    subject: "Respuesta de Smart Loyalty",
    text: `${message}\n\n—\nSmart Loyalty · smartloyalty.app\n\n> ${original.replace(/\n/g, "\n> ")}`,
  });
  if (!result.sent) return Response.json({ error: "No se pudo enviar la respuesta." }, { status: 502 });

  await ref.update({
    status: "respondido",
    replies: FieldValue.arrayUnion({ message, by: admin.email ?? "", at: new Date() }),
  });
  return Response.json({ ok: true, from: supportFrom() });
}
