// Envío de correos (respuestas de soporte y avisos al equipo) con Resend.
// Sin RESEND_API_KEY no se envía nada: el resto del sistema sigue funcionando igual.

const API = "https://api.resend.com/emails";

export const emailReady = () => Boolean(process.env.RESEND_API_KEY);

export const supportFrom = () => process.env.SUPPORT_FROM || "Smart Loyalty <soporte@smartloyalty.app>";

export async function sendEmail({
  to,
  subject,
  text,
  replyTo,
}: {
  to: string | string[];
  subject: string;
  text: string;
  replyTo?: string;
}) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { sent: false, error: "sin-clave" as const };

  const res = await fetch(API, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: supportFrom(),
      to: Array.isArray(to) ? to : [to],
      subject: subject.slice(0, 200),
      text,
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
  });
  if (!res.ok) {
    console.error("Resend", res.status, await res.text());
    return { sent: false, error: "falló" as const };
  }
  return { sent: true as const };
}

// Correos del equipo que reciben los avisos (los mismos que entran al administrador).
export const adminEmails = () =>
  (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
