import { NextRequest } from "next/server";
import { adminAuth, adminDb } from "../../../../firebase/admin";
import { syncWalletCards, walletIssuerId, type WalletCompany } from "../../../../lib/google-wallet";
import { publicOrigin } from "../../../../lib/origin";

export const runtime = "nodejs";
export const maxDuration = 60;

// El dueño guardó cambios: actualizar las tarjetas que sus clientes ya tienen.
export async function POST(req: NextRequest) {
  if (!walletIssuerId()) return Response.json({ updated: 0 });

  const idToken = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!idToken) return Response.json({ error: "No autorizado" }, { status: 401 });
  let uid: string;
  try {
    uid = (await adminAuth().verifyIdToken(idToken)).uid;
  } catch {
    return Response.json({ error: "Sesión inválida" }, { status: 401 });
  }

  const companyRef = adminDb().collection("companies").doc(uid);
  const company = await companyRef.get();
  if (!company.exists) return Response.json({ updated: 0 });

  const members = await companyRef.collection("walletMembers").select("stamps", "name").get();
  const stampsByMember = Object.fromEntries(members.docs.map((d) => [d.id, d.data().stamps ?? 0]));
  const namesByMember = Object.fromEntries(members.docs.map((d) => [d.id, d.data().name ?? ""]));

  try {
    const updated = await syncWalletCards(
      { ...company.data(), id: uid } as WalletCompany,
      publicOrigin(req.nextUrl.origin),
      stampsByMember,
      namesByMember
    );
    return Response.json({ updated });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "No se pudieron actualizar las tarjetas" }, { status: 502 });
  }
}
