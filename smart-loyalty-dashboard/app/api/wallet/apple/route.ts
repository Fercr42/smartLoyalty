import { NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "../../../firebase/admin";
import { appleWalletEnabled } from "../../../lib/apple-wallet";
import { buildMemberPass } from "../../../lib/apple-wallet-updates";
import { publicOrigin } from "../../../lib/origin";

export const runtime = "nodejs";
export const maxDuration = 30;

const COMPANY_ID = /^[A-Za-z0-9]{10,64}$/;
const MEMBER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// "Agregar a Apple Wallet": Safari abre el .pkpass y muestra la tarjeta para guardarla.
// Es un GET (enlace normal) porque Safari solo ofrece guardar el pase al navegar a él.
export async function GET(req: NextRequest) {
  if (!appleWalletEnabled()) return new Response("Apple Wallet aún no está configurado", { status: 503 });
  const companyId = req.nextUrl.searchParams.get("companyId") ?? "";
  const memberId = req.nextUrl.searchParams.get("memberId") ?? "";
  if (!COMPANY_ID.test(companyId) || !MEMBER_ID.test(memberId)) return new Response("Datos inválidos", { status: 400 });

  const companyRef = adminDb().collection("companies").doc(companyId);
  if (!(await companyRef.get()).exists) return new Response("Negocio no encontrado", { status: 404 });

  // Registro del cliente (para el conteo del dueño y los puntos). Cuenta como Wallet cuando el iPhone se registra.
  await companyRef
    .collection("walletMembers")
    .doc(memberId)
    .create({ platform: "web", stamps: 0, totalVisits: 0, createdAt: FieldValue.serverTimestamp() })
    .catch(() => {}); // ya existía

  try {
    const pass = await buildMemberPass(companyId, memberId, publicOrigin(req.nextUrl.origin));
    if (!pass) return new Response("Negocio no encontrado", { status: 404 });
    return new Response(new Uint8Array(pass), {
      headers: {
        "Content-Type": "application/vnd.apple.pkpass",
        "Content-Disposition": `attachment; filename="tarjeta.pkpass"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("Apple Wallet", e);
    return new Response("No se pudo crear la tarjeta", { status: 500 });
  }
}
