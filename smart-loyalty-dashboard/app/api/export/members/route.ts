import { NextRequest } from "next/server";
import type { Timestamp } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "../../../firebase/admin";

export const runtime = "nodejs";

// Lista de clientes en CSV para abrir en Excel.
// Separador ";" (Excel en español lo usa) y BOM para que respete los acentos.
const SEP = ";";
const cell = (value: unknown) => {
  const text = String(value ?? "");
  return /[";\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};
const day = (t?: Timestamp) => (t?.toDate ? t.toDate().toISOString().slice(0, 10) : "");

export async function GET(req: NextRequest) {
  const idToken = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!idToken) return Response.json({ error: "No autorizado" }, { status: 401 });
  let uid: string;
  try {
    uid = (await adminAuth().verifyIdToken(idToken)).uid;
  } catch {
    return Response.json({ error: "Sesión inválida" }, { status: 401 });
  }

  const companyRef = adminDb().collection("companies").doc(uid);
  const [members, subscribers] = await Promise.all([
    companyRef.collection("walletMembers").get(),
    companyRef.collection("subscribers").select("memberId").get(),
  ]);
  const withPush = new Set(subscribers.docs.map((d) => d.data().memberId).filter(Boolean));

  const rows: unknown[][] = [
    ["Nombre", "Código", "Correo", "Cumpleaños (MM-DD)", "Tipo de tarjeta", "Puntos", "Visitas", "Cliente desde", "Última visita", "Último canje", "Recibe notificaciones"],
    ...members.docs.filter((d) => !d.data().mergedInto).map((d) => {
      const m = d.data();
      return [
        m.name ?? "",
        d.id.slice(0, 8).toUpperCase(),
        m.email ?? "",
        m.birthday ?? "",
        m.platform === "google" ? "Google Wallet" : "Web",
        m.stamps ?? 0,
        m.totalVisits ?? 0,
        day(m.createdAt),
        day(m.lastStampAt),
        day(m.lastRedeemAt),
        withPush.has(d.id) ? "Sí" : "No",
      ];
    }),
  ];
  const csv = "﻿" + rows.map((r) => r.map(cell).join(SEP)).join("\r\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="clientes-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
