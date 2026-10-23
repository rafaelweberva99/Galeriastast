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
import { applyCorrections, crossCheck, runQualityChecks, type Correction } from "../src/lib/ingest/quality.ts";

const db = openDb();
const resolver = loadCatalog(db);
const resolve = (name: string) => resolver.resolve(name);

const correctionsFile = path.resolve("data/corrections.csv");
if (existsSync(correctionsFile)) {
  const rows = parseCsv(readFileSync(correctionsFile, "utf8"));
  const corrections: Correction[] = rows.map((r) => ({
    date: r.date,
    home: r.home,
    away: r.away,
    field: r.field as Correction["field"],
    correctValue: r.correct_value,
  }));
  console.log(`Correcciones aplicadas: ${applyCorrections(db, corrections, resolve)} de ${corrections.length}`);
}

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
    const res = crossCheck(db, rows, resolve);
    console.log(`${file}: ${res.matched} coinciden, ${res.mismatched.length} discrepan, ${res.notFound} no encontrados`);
    res.mismatched.slice(0, 20).forEach((m) => console.log(`  ≠ ${m}`));
  }
}

const issues = runQualityChecks(db);
const errors = issues.filter((i) => i.severity === "error");
for (const i of issues) console.log(`[${i.severity}] ${i.check}: ${i.detail}`);
const { n, v } = db.prepare("SELECT COUNT(*) AS n, SUM(verified) AS v FROM matches").get() as { n: number; v: number };
console.log(`\n${n} partidos, ${v ?? 0} verificados con segunda fuente. ${errors.length} errores, ${issues.length - errors.length} advertencias.`);
process.exit(errors.length ? 1 : 0);
