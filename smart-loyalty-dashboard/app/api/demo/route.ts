import { NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "../../firebase/admin";
import { adminEmails, sendEmail } from "../../lib/email";
import { cleanName } from "../../lib/member-name";

export const runtime = "nodejs";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_PER_HOUR = 5;
const clip = (value: unknown, max: number) => String(value ?? "").trim().slice(0, max);

// Solicitudes de demo desde /demo. Se guardan y se avisan por correo al equipo.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const name = cleanName(body.name).slice(0, 80);
  const phone = clip(body.phone, 40);
  const email = clip(body.email, 120).toLowerCase();
  const business = cleanName(body.business).slice(0, 80);

  if (!name) return Response.json({ error: "Escribe tu nombre." }, { status: 400 });
  if (!phone && !EMAIL.test(email)) {
    return Response.json({ error: "Déjanos tu WhatsApp o tu correo para contactarte." }, { status: 400 });
  }
  if (email && !EMAIL.test(email)) return Response.json({ error: "Ese correo no parece válido." }, { status: 400 });

  const requests = adminDb().collection("demoRequests");
  // Tope sencillo por contacto, para que nadie llene la bandeja.
  const key = email || phone;
  const mine = await requests.where("key", "==", key).select("at").limit(50).get();
  const hourAgo = Date.now() - 3_600_000;
  if (mine.docs.filter((d) => (d.data().at?.toMillis?.() ?? 0) > hourAgo).length >= MAX_PER_HOUR) {
    return Response.json({ error: "Ya recibimos tu solicitud. Te escribimos pronto." }, { status: 429 });
  }

  const kind = clip(body.kind, 40);
  const when = clip(body.when, 120);
  const message = clip(body.message, 2000);
  await requests.add({
    key,
    name,
    business,
    phone,
    email: email || "",
    kind,
    when,
    message,
    locale: clip(body.locale, 5),
    status: "nuevo",
    at: FieldValue.serverTimestamp(),
  });

  // Las pruebas automáticas usan @example.com: no avisan al equipo.
  const team = email.endsWith("@example.com") ? [] : adminEmails();
  if (team.length) {
    await sendEmail({
      to: team,
      ...(EMAIL.test(email) ? { replyTo: email } : {}),
      subject: `Demo: ${business || name}`,
      text: [
        `Nombre: ${name}`,
        `Negocio: ${business || "(sin nombre)"}`,
        `WhatsApp: ${phone || "(no dejó)"}`,
        `Correo: ${email || "(no dejó)"}`,
        `Tipo: ${kind || "(sin decir)"}`,
        `Cuándo le queda bien: ${when || "(sin decir)"}`,
        "",
        message || "(sin mensaje)",
        "",
        "Las solicitudes se ven en https://smartloyalty.app/admin",
      ].join("\n"),
    }).catch((e) => console.error("Aviso de demo", e));
  }

  return Response.json({ ok: true });
}
