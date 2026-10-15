import { NextRequest } from "next/server";
import { adminAuth, adminDb } from "../../../../firebase/admin";
import { appleWalletEnabled } from "../../../../lib/apple-wallet";
import { refreshApplePasses } from "../../../../lib/apple-wallet-updates";
import { syncWalletCards, walletIssuerId, type WalletCompany } from "../../../../lib/google-wallet";
import { publicOrigin } from "../../../../lib/origin";

export const runtime = "nodejs";
export const maxDuration = 60;

// El dueño guardó cambios: actualizar las tarjetas que sus clientes ya tienen (Google y Apple Wallet).
export async function POST(req: NextRequest) {
  const google = Boolean(walletIssuerId());
  const apple = appleWalletEnabled();
  if (!google && !apple) return Response.json({ updated: 0 });

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

  let updated = 0;
  let failed = false;

  if (apple) {
    // Los iPhones descargan el pase nuevo con el diseño actual.
    updated += await refreshApplePasses(uid, null).catch((e) => {
      console.error("Apple Wallet sync", e);
      failed = true;
      return 0;
    });
  }

  if (google) {
    const members = await companyRef.collection("walletMembers").select("stamps", "name").get();
    const stampsByMember = Object.fromEntries(members.docs.map((d) => [d.id, d.data().stamps ?? 0]));
    const namesByMember = Object.fromEntries(members.docs.map((d) => [d.id, d.data().name ?? ""]));
    try {
      updated += await syncWalletCards(
        { ...company.data(), id: uid } as WalletCompany,
        publicOrigin(req.nextUrl.origin),
        stampsByMember,
        namesByMember
      );
    } catch (e) {
      console.error(e);
      failed = true;
    }
  }

  if (failed && !updated) return Response.json({ error: "No se pudieron actualizar las tarjetas" }, { status: 502 });
  return Response.json({ updated });
}
