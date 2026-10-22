import { createHash, createHmac, timingSafeEqual } from "crypto";
import { NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "../../../firebase/admin";
import { appleConfig } from "../../../lib/apple-wallet";
import { buildMemberPass } from "../../../lib/apple-wallet-updates";
import { passcreatorReady } from "../../../lib/passcreator-config";
import { passLink } from "../../../lib/passcreator";
import { publicOrigin } from "../../../lib/origin";

export const runtime = "nodejs";
export const maxDuration = 30;

const COMPANY_ID = /^[A-Za-z0-9]{10,64}$/;
const MEMBER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LINK_MS = 5 * 60_000;

// Firma del enlace de descarga. La clave sale de la llave privada del certificado (no hace falta otra variable).
function linkSignature(companyId: string, memberId: string, expires: number) {
  const config = appleConfig();
  const key = createHash("sha256").update(`apple-download:${config?.signerKey ?? ""}`).digest();
  return createHmac("sha256", key).update(`${companyId}.${memberId}.${expires}`).digest("base64url");
}

// 1) La página del cliente pide el enlace. Crea su registro si aún no existe (igual que Google Wallet).
export async function POST(req: NextRequest) {
  const own = Boolean(appleConfig());
  if (!own && !passcreatorReady()) return Response.json({ error: "Apple Wallet aún no está configurado" }, { status: 503 });
  const { companyId, memberId } = await req.json().catch(() => ({}));
  if (!COMPANY_ID.test(companyId ?? "") || !MEMBER_ID.test(memberId ?? "")) {
    return Response.json({ error: "Datos inválidos" }, { status: 400 });
  }
  const companyRef = adminDb().collection("companies").doc(companyId);
  if (!(await companyRef.get()).exists) return Response.json({ error: "Restaurante no encontrado" }, { status: 404 });
  await companyRef
    .collection("walletMembers")
    .doc(memberId)
    .create({ platform: "web", stamps: 0, totalVisits: 0, createdAt: FieldValue.serverTimestamp() })
    .catch(() => {}); // ya existía

  // Sin certificado propio: Passcreator crea el pase y nos da el enlace para guardarlo.
  if (!own) {
    try {
      const url = await passLink(companyId, memberId, publicOrigin(req.nextUrl.origin));
      if (!url) return Response.json({ error: "Tarjeta no encontrada" }, { status: 404 });
      return Response.json({ url });
    } catch (e) {
      console.error("Apple Wallet (Passcreator)", e);
      return Response.json({ error: "No se pudo crear la tarjeta" }, { status: 502 });
    }
  }

  const expires = Date.now() + LINK_MS;
  const params = new URLSearchParams({ companyId, memberId, e: String(expires), s: linkSignature(companyId, memberId, expires) });
  return Response.json({ url: `/api/wallet/apple?${params}` });
}

// 2) Safari abre el enlace y ofrece guardar el pase. Es un GET porque Safari solo lo ofrece al navegar.
// El enlace vence en 5 minutos y no crea clientes.
export async function GET(req: NextRequest) {
  if (!appleConfig()) return new Response("Apple Wallet aún no está configurado", { status: 503 });
  const q = req.nextUrl.searchParams;
  const companyId = q.get("companyId") ?? "";
  const memberId = q.get("memberId") ?? "";
  const expires = Number(q.get("e"));
  if (!COMPANY_ID.test(companyId) || !MEMBER_ID.test(memberId)) return new Response("Datos inválidos", { status: 400 });
  const given = Buffer.from(q.get("s") ?? "");
  const wanted = Buffer.from(linkSignature(companyId, memberId, expires));
  if (!(expires > Date.now()) || given.length !== wanted.length || !timingSafeEqual(given, wanted)) {
    return new Response("El enlace venció. Vuelve a tocar Agregar a Apple Wallet.", { status: 403 });
  }

  try {
    const pass = await buildMemberPass(companyId, memberId, publicOrigin(req.nextUrl.origin));
    if (!pass) return new Response("Tarjeta no encontrada", { status: 404 });
    return new Response(new Uint8Array(pass), {
      headers: {
        "Content-Type": "application/vnd.apple.pkpass",
        "Content-Disposition": `attachment; filename="tarjeta.pkpass"`,
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch (e) {
    console.error("Apple Wallet", e);
    return new Response("No se pudo crear la tarjeta", { status: 500 });
  }
}
