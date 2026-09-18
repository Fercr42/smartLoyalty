import { NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "../../firebase/admin";
import { isLocale } from "../../i18n/config";
import { cleanBusinessType } from "../../lib/business-types";
import { TRIAL_DAYS } from "../../lib/plan";

export const runtime = "nodejs";

const clip = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

function validTimezone(tz: string) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return tz;
  } catch {
    return "UTC";
  }
}

// Registro de un restaurante nuevo: crea su perfil y empieza la prueba gratis (una sola vez por cuenta).
export async function POST(req: NextRequest) {
  const idToken = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!idToken) return Response.json({ error: "Inicia sesión con Google para registrarte" }, { status: 401 });
  let uid: string;
  let email: string | undefined;
  try {
    const decoded = await adminAuth().verifyIdToken(idToken);
    uid = decoded.uid;
    email = decoded.email;
  } catch {
    return Response.json({ error: "Sesión inválida" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const name = clip(body.name, 60);
  const ownerName = clip(body.ownerName, 60);
  const phone = clip(body.phone, 30);
  const city = clip(body.city, 60);
  if (name.length < 2) return Response.json({ error: "Escribe el nombre del restaurante" }, { status: 400 });
  if (!ownerName) return Response.json({ error: "Escribe tu nombre" }, { status: 400 });
  if (!/^[+\d][\d\s-]{6,}$/.test(phone)) {
    return Response.json({ error: "Escribe un número de WhatsApp válido, ej. +506 8888 8888" }, { status: 400 });
  }

  const companyRef = adminDb().collection("companies").doc(uid);
  const result = await adminDb().runTransaction(async (tx) => {
    const snap = await tx.get(companyRef);
    if (snap.data()?.plan?.status) return { existing: true };
    const now = Date.now();
    tx.set(
      companyRef,
      {
        name: snap.data()?.name || name,
        owner: email ?? null,
        ownerName,
        phone,
        city,
        businessType: cleanBusinessType(body.businessType),
        language: isLocale(body.language) ? body.language : "es",
        timezone: validTimezone(clip(body.timezone, 60)),
        plan: { status: "trial", startedAt: now, trialEndsAt: now + TRIAL_DAYS * 86_400_000 },
        createdAt: snap.exists ? snap.data()?.createdAt ?? FieldValue.serverTimestamp() : FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    return { existing: false };
  });

  return Response.json({ ok: true, ...result });
}
