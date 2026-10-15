import { doc, getDoc } from "firebase/firestore";
import { dataImageResponse } from "../../lib/data-image";
import { db } from "../../firebase/config";

// Sirve el logo guardado en Firestore como imagen normal (para <img>, notificaciones y el ícono de inicio).
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const { companyId } = await params;
  const snap = await getDoc(doc(db, "companies", companyId));
  return dataImageResponse(snap.data()?.logoData, "Sin logo");
}
