import { NextRequest } from "next/server";
import type { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "../../firebase/admin";
import { resolveCompanyId } from "../../lib/api-company";

export const runtime = "nodejs";

const MAX = 2000;
const ms = (t?: Timestamp) => (t?.toMillis ? t.toMillis() : null);

// Lista de clientes para el panel: nombre, puntos, visitas y cómo contactarlos.
// Los más recientes primero. El administrador la ve en solo lectura con ?companyId=.
export async function GET(req: NextRequest) {
  const companyId = await resolveCompanyId(req);
  if (companyId instanceof Response) return companyId;

  const companyRef = adminDb().collection("companies").doc(companyId);
  const [members, subscribers] = await Promise.all([
    companyRef.collection("walletMembers").get(),
    companyRef.collection("subscribers").select("memberId").get(),
  ]);
  const withPush = new Set(subscribers.docs.map((d) => d.data().memberId).filter(Boolean));

  const list = members.docs
    .filter((d) => !d.data().mergedInto)
    .map((d) => {
      const m = d.data();
      return {
        code: d.id.slice(0, 8).toUpperCase(),
        name: typeof m.name === "string" ? m.name : "",
        points: m.stamps ?? 0,
        visits: m.totalVisits ?? 0,
        lastVisit: ms(m.lastStampAt),
        since: ms(m.createdAt),
        email: typeof m.email === "string" ? m.email : "",
        birthday: typeof m.birthday === "string" ? m.birthday : "",
        wallet: m.platform === "google",
        push: withPush.has(d.id),
      };
    })
    .sort((a, b) => (b.lastVisit ?? b.since ?? 0) - (a.lastVisit ?? a.since ?? 0));

  return Response.json({ total: list.length, members: list.slice(0, MAX) });
}
