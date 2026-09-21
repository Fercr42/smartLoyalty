import type { NextRequest } from "next/server";
import { adminAuth } from "../firebase/admin";
import { requireAdmin } from "./admin-auth";

const COMPANY_ID = /^[A-Za-z0-9]{10,64}$/;

// Restaurante sobre el que trabaja la petición: el del dueño con sesión, o el que pide
// el administrador de la plataforma con ?companyId= (solo lectura de sus datos).
export async function resolveCompanyId(req: NextRequest): Promise<string | Response> {
  const idToken = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!idToken) return Response.json({ error: "No autorizado" }, { status: 401 });
  let uid: string;
  try {
    uid = (await adminAuth().verifyIdToken(idToken)).uid;
  } catch {
    return Response.json({ error: "Sesión inválida" }, { status: 401 });
  }
  const asked = req.nextUrl.searchParams.get("companyId");
  if (!asked || asked === uid) return uid;
  if (!COMPANY_ID.test(asked)) return Response.json({ error: "Restaurante inválido" }, { status: 400 });
  const admin = await requireAdmin(req);
  if (admin instanceof Response) return admin;
  return asked;
}
