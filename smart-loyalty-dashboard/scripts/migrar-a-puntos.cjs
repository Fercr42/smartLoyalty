// Migración a puntos: multiplica saldos y metas x1000, agrega regla y moneda.
// node mig-puntos.cjs           -> solo muestra lo que haría
// node mig-puntos.cjs --apply   -> escribe
const fs = require("node:fs");
const path = require("node:path");
const admin = require("firebase-admin");

const root = "C:/Users/ferna/Desktop/smartLoyalty/smart-loyalty-dashboard";
const env = Object.fromEntries(
  fs.readFileSync(path.join(root, ".env.local"), "utf8").split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim().replace(/^"|"$/g, "")]),
);
admin.initializeApp({ credential: admin.credential.cert(JSON.parse(env.FIREBASE_SERVICE_ACCOUNT)) });
const db = admin.firestore();

const FACTOR = 1000;
const RULE = { points: 1000, per: 5000 };
const CURRENCY = "₡";
const apply = process.argv.includes("--apply");

(async () => {
  const companies = await db.collection("companies").get();
  for (const doc of companies.docs) {
    const c = doc.data();
    if (c.name?.startsWith("zz")) continue;
    const loyalty = c.loyalty || {};
    const rewards = Array.isArray(loyalty.rewards) ? loyalty.rewards : [];
    const needsRule = !loyalty.rule?.points || !loyalty.rule?.per;
    const small = rewards.filter((r) => Number(r.stamps) > 0 && Number(r.stamps) < 1000);
    console.log(`\n${c.name || doc.id} (${doc.id})`);
    console.log("  regla:", loyalty.rule || "—", "moneda:", loyalty.currency || "—");
    console.log("  premios:", rewards.map((r) => `${r.title}=${r.stamps}`).join(", ") || "—");
    if (!needsRule && small.length === 0) { console.log("  ya está en puntos, se salta"); continue; }

    const members = await doc.ref.collection("walletMembers").get();
    const saldos = members.docs.map((m) => m.data().stamps ?? 0);
    console.log(`  clientes: ${members.size}, saldos: ${saldos.join(",") || "—"}`);
    if (!apply) { console.log("  -> multiplicaría x1000 y pondría regla/moneda"); continue; }

    await doc.ref.update({
      "loyalty.rewards": rewards.map((r) => ({ ...r, stamps: Number(r.stamps) * FACTOR })),
      "loyalty.rule": RULE,
      "loyalty.currency": loyalty.currency || CURRENCY,
    });
    let batch = db.batch(), n = 0;
    for (const m of members.docs) {
      const stamps = Number(m.data().stamps ?? 0);
      if (!stamps) continue;
      batch.update(m.ref, { stamps: stamps * FACTOR });
      if (++n === 400) { await batch.commit(); batch = db.batch(); n = 0; }
    }
    if (n) await batch.commit();
    console.log("  -> migrado");
  }
  console.log("\nlisto");
  process.exit(0);
})();
