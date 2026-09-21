// Reporte del piloto: baja a Excel (CSV) todo lo que pasó en uno o varios restaurantes.
//
//   node scripts/reporte-piloto.cjs <idRestaurante> [otroId...] [--dias 180] [--salida reportes]
//
// Crea una carpeta por restaurante con: clientes.csv, visitas.csv, campanas.csv,
// opiniones.csv y resumen-diario.csv. Lee las credenciales de .env.local.

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
for (const line of fs.readFileSync(path.join(root, ".env.local"), "utf8").split(/\r?\n/)) {
  const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (match && !process.env[match[1]] && match[2] !== "") process.env[match[1]] = match[2];
}

const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const days = Number(option("dias", 180));
const outDir = option("salida", "reportes");
const companyIds = args.filter((value, i) => !value.startsWith("--") && !args[i - 1]?.startsWith("--"));

if (!companyIds.length) {
  console.error("Uso: node scripts/reporte-piloto.cjs <idRestaurante> [otroId...] [--dias 180] [--salida reportes]");
  process.exit(1);
}

const db = getFirestore(initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) }));

const DAY = 86_400_000;
const RETURN_WINDOW_DAYS = 7;
const ms = (value) => value?.toMillis?.() ?? null;
const iso = (value) => (value ? new Date(value).toISOString() : "");
const day = (value) => (value ? new Date(value).toISOString().slice(0, 10) : "");
const hour = (value) => (value ? new Date(value).toISOString().slice(11, 16) : "");

// Excel en español abre bien con punto y coma y BOM.
const cell = (value) => {
  const text = value === null || value === undefined ? "" : String(value);
  return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};
function writeCsv(file, rows) {
  const header = Object.keys(rows[0] ?? { vacio: "" });
  const lines = [header.join(";"), ...rows.map((r) => header.map((h) => cell(r[h])).join(";"))];
  fs.writeFileSync(file, "﻿" + lines.join("\n"), "utf8");
  return rows.length;
}

async function report(companyId) {
  const ref = db.collection("companies").doc(companyId);
  const company = await ref.get();
  if (!company.exists) {
    console.error(`No existe el restaurante ${companyId}`);
    return;
  }
  const since = Timestamp.fromMillis(Date.now() - days * DAY);
  const [members, events, notifications, feedback, coupons] = await Promise.all([
    ref.collection("walletMembers").get(),
    ref.collection("loyaltyEvents").where("at", ">=", since).get(),
    ref.collection("notifications").where("createdAt", ">=", since).orderBy("createdAt", "desc").get(),
    ref.collection("feedback").where("at", ">=", since).get(),
    ref.collection("coupons").get(),
  ]);

  const name = (company.data().name || companyId).replace(/[^\w\s-]/g, "").trim() || companyId;
  const dir = path.join(root, outDir, `${name} (${companyId})`);
  fs.mkdirSync(dir, { recursive: true });

  const couponById = new Map(coupons.docs.map((d) => [d.id, d.data()]));
  const codeOf = new Map(members.docs.map((d) => [d.id, d.id.slice(0, 8).toUpperCase()]));

  const clientes = members.docs.map((d) => {
    const m = d.data();
    return {
      cliente: codeOf.get(d.id),
      alta: day(ms(m.createdAt)),
      sellos: m.stamps ?? 0,
      visitas: m.totalVisits ?? 0,
      ultima_visita: day(ms(m.lastStampAt)),
      cumple: m.birthday ?? "",
      correo_ligado: m.email ? "si" : "no",
      wallet_guardada: m.walletCardSaved ? "si" : "no",
    };
  });

  const visitas = events.docs
    .map((d) => {
      const e = d.data();
      const at = ms(e.at);
      return {
        fecha: day(at),
        hora: hour(at),
        tipo: e.type ?? "",
        cliente: e.memberId ? codeOf.get(e.memberId) ?? e.code ?? "" : e.code ?? "",
        premio: e.rewardTitle ?? "",
        cupon: e.couponTitle ?? "",
        sellos_despues: e.stampsAfter ?? "",
        _at: at ?? 0,
      };
    })
    .sort((a, b) => a._at - b._at)
    .map(({ _at, ...row }) => row);

  // Quién volvió después de cada campaña (mismo cálculo que el panel).
  const visitsByMember = new Map();
  events.docs.forEach((d) => {
    const e = d.data();
    if (e.type !== "stamp") return;
    const at = ms(e.at);
    if (!at || !e.memberId) return;
    visitsByMember.set(e.memberId, [...(visitsByMember.get(e.memberId) ?? []), at]);
  });

  const campanas = notifications.docs.map((d) => {
    const n = d.data();
    const sentAt = ms(n.createdAt) ?? 0;
    const windowEnd = sentAt + RETURN_WINDOW_DAYS * DAY;
    const recipients = Array.isArray(n.recipients) ? n.recipients : null;
    let volvieron = 0;
    let visitasGeneradas = 0;
    recipients?.forEach((memberId) => {
      const inWindow = (visitsByMember.get(memberId) ?? []).filter((t) => t >= sentAt && t <= windowEnd).length;
      if (inWindow) volvieron++;
      visitasGeneradas += inWindow;
    });
    const coupon = n.couponId ? couponById.get(n.couponId) : null;
    return {
      fecha: day(sentAt),
      hora: hour(sentAt),
      titulo: n.title ?? "",
      mensaje: n.body ?? "",
      automatico: n.kind ?? "",
      grupo: n.audience ?? "",
      enviados: n.sent ?? 0,
      aperturas: n.views ?? 0,
      aperturas_wallet: n.walletViews ?? 0,
      destinatarios: recipients ? n.recipientCount ?? recipients.length : "",
      volvieron: recipients ? volvieron : "",
      visitas_generadas: recipients ? visitasGeneradas : "",
      cupon: coupon?.title ?? "",
      cupones_usados: coupon?.redemptions ?? "",
    };
  });

  const opiniones = feedback.docs
    .map((d) => {
      const f = d.data();
      const at = ms(f.at);
      return { fecha: day(at), estrellas: f.rating ?? "", comentario: f.comment ?? "", cliente: f.code ?? "", _at: at ?? 0 };
    })
    .sort((a, b) => a._at - b._at)
    .map(({ _at, ...row }) => row);

  // Un día por fila: sirve para comparar antes y después de encender las campañas.
  const byDay = new Map();
  const touch = (key) => {
    if (!byDay.has(key)) byDay.set(key, { fecha: key, visitas: 0, clientes_distintos: new Set(), premios: 0, cupones: 0, clientes_nuevos: 0, envios: 0 });
    return byDay.get(key);
  };
  events.docs.forEach((d) => {
    const e = d.data();
    const key = day(ms(e.at));
    if (!key) return;
    const row = touch(key);
    if (e.type === "stamp") {
      row.visitas++;
      if (e.memberId) row.clientes_distintos.add(e.memberId);
    }
    if (e.type === "redeem") row.premios++;
    if (e.type === "coupon") row.cupones++;
  });
  members.docs.forEach((d) => {
    const key = day(ms(d.data().createdAt));
    if (key) touch(key).clientes_nuevos++;
  });
  notifications.docs.forEach((d) => {
    const key = day(ms(d.data().createdAt));
    if (key) touch(key).envios++;
  });
  const resumen = [...byDay.values()]
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .map((r) => ({ ...r, clientes_distintos: r.clientes_distintos.size }));

  writeCsv(path.join(dir, "clientes.csv"), clientes);
  writeCsv(path.join(dir, "visitas.csv"), visitas);
  writeCsv(path.join(dir, "campanas.csv"), campanas);
  writeCsv(path.join(dir, "opiniones.csv"), opiniones);
  writeCsv(path.join(dir, "resumen-diario.csv"), resumen);

  const stamps = visitas.filter((v) => v.tipo === "stamp").length;
  const repetidos = [...visitsByMember.values()].filter((list) => list.length >= 2).length;
  const medidas = campanas.filter((c) => c.destinatarios !== "");
  const alcance = medidas.reduce((sum, c) => sum + Number(c.destinatarios || 0), 0);
  const regresos = medidas.reduce((sum, c) => sum + Number(c.volvieron || 0), 0);
  const notas = feedback.docs.map((d) => d.data().rating).filter((n) => n > 0);

  console.log(`\n${company.data().name || companyId} (${companyId}) · últimos ${days} días`);
  console.log(`  Clientes con tarjeta: ${clientes.length} · visitas: ${stamps} · clientes que volvieron: ${repetidos}`);
  console.log(`  Campañas: ${campanas.length} · alcance medido: ${alcance} · volvieron: ${regresos}${alcance ? ` (${Math.round((regresos / alcance) * 100)}%)` : ""}`);
  console.log(`  Opiniones: ${notas.length}${notas.length ? ` · promedio ${(notas.reduce((a, b) => a + b, 0) / notas.length).toFixed(1)} estrellas` : ""}`);
  console.log(`  Archivos en: ${dir}`);
}

(async () => {
  for (const id of companyIds) await report(id);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
