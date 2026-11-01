/**
 * Carga el catálogo (clubes, competiciones, clásicos) y los partidos de data/raw/wfb/ en la base
 * (Postgres si hay DATABASE_URL, si no SQLite local). Idempotente.
 * Uso: npm run data:ingest            (INGEST_FORCE=1 recarga también archivos sin cambios)
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { openDb } from "../src/lib/db/client.ts";
import { loadCatalog } from "../src/lib/ingest/catalog.ts";
import { ingestMatchesCsv, ingestWfb, migrateForeignAliases, reconcileRescheduled } from "../src/lib/ingest/load.ts";

const rawDir = path.resolve("data/raw/wfb");
if (!existsSync(rawDir)) {
  console.error("No hay datos crudos. Ejecuta primero: npm run data:fetch");
  process.exit(1);
}

const db = await openDb();
console.log(`Base de datos: ${db.dialect === "pg" ? "Postgres" : "SQLite"}`);
const report = await ingestWfb(db, rawDir, { force: process.env.INGEST_FORCE === "1", log: console.log });
console.log(
  `\nTotal: ${report.total} partidos cargados; ${report.corrections.applied} de ${report.corrections.of} correcciones aplicadas.`,
);
if (report.unknownTeams.length) {
  console.log(
    `${report.unknownTeams.length} clubes chilenos fuera del catálogo (creados automáticamente; agrega alias en data/catalog/teams.json si corresponde):`,
  );
  console.log(report.unknownTeams.join(", "));
}
// Temporadas recientes y otras competiciones en CSV normalizado (data/matches/*.csv).
const csvDir = path.resolve("data/matches");
if (existsSync(csvDir)) {
  const resolver = await loadCatalog(db);
  const csvIds = new Set<string>();
  for (const f of readdirSync(csvDir).filter((x) => x.endsWith(".csv")).sort()) {
    const r = await ingestMatchesCsv(db, f, readFileSync(path.join(csvDir, f), "utf8"), resolver);
    r.ids.forEach((id) => csvIds.add(id));
    console.log(`${f.padEnd(22)} ${String(r.loaded).padStart(4)} partidos`);
    r.rejected.forEach((x) => console.warn(`  rechazado ${x}`));
    if (r.unknownTeams.length) console.log(`  clubes chilenos fuera del catálogo: ${r.unknownTeams.join(", ")}`);
  }
  // Partidos que cambiaron de fecha: el registro antiguo se reemplaza por el nuevo (con sus asistencias).
  const rescheduled = await reconcileRescheduled(db, csvIds);
  if (rescheduled) console.log(`${rescheduled} partidos reprogramados (se movieron a su nueva fecha)`);
}
const renamed = await migrateForeignAliases(db);
if (renamed) console.log(`${renamed} partidos pasaron al nombre actual de su club (data/catalog/foreign-aliases.json)`);
await db.close();
