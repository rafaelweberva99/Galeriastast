/**
 * Verificación de calidad de datos:
 *  1. aplica data/corrections.csv (errores confirmados por el agente verificador con evidencia),
 *  2. contrasta contra fuentes independientes en data/crosscheck/*.csv (marca `verified = 1`),
 *  3. ejecuta chequeos de consistencia y sale con código 1 si hay errores.
 * Uso: npm run data:verify
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { openDb } from "../src/lib/db/client.ts";
import { loadCatalog } from "../src/lib/ingest/catalog.ts";
import { parseCsv } from "../src/lib/ingest/csv.ts";
import { applyCorrections, crossCheck, loadCorrections, runQualityChecks } from "../src/lib/ingest/quality.ts";

const db = await openDb();
const resolver = await loadCatalog(db);
const resolve = (name: string) => resolver.resolve(name);

const corrections = loadCorrections();
console.log(`Correcciones aplicadas: ${await applyCorrections(db, corrections, resolve)} de ${corrections.length}`);

const crossDir = path.resolve("data/crosscheck");
if (existsSync(crossDir)) {
  for (const file of readdirSync(crossDir).filter((f) => f.endsWith(".csv"))) {
    const rows = parseCsv(readFileSync(path.join(crossDir, file), "utf8")).map((r) => ({
      date: r.date,
      home: r.home,
      away: r.away,
      homeGoals: Number(r.home_goals),
      awayGoals: Number(r.away_goals),
    }));
    const res = await crossCheck(db, rows, resolve);
    console.log(`${file}: ${res.matched} coinciden, ${res.mismatched.length} discrepan, ${res.notFound} no encontrados`);
    res.mismatched.slice(0, 20).forEach((m) => console.log(`  ≠ ${m}`));
  }
}

const issues = await runQualityChecks(db);
const errors = issues.filter((i) => i.severity === "error");
for (const i of issues) console.log(`[${i.severity}] ${i.check}: ${i.detail}`);
const counts = (await db.get("SELECT COUNT(*) AS n, SUM(verified) AS v FROM matches"))!;
const n = Number(counts.n);
const v = Number(counts.v ?? 0);
console.log(`\n${n} partidos, ${v ?? 0} verificados con segunda fuente. ${errors.length} errores, ${issues.length - errors.length} advertencias.`);
await db.close();
process.exit(errors.length ? 1 : 0);
