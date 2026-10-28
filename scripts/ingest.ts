/**
 * Carga el catálogo (clubes, competiciones, clásicos) y los partidos de data/raw/wfb/ en la base
 * (Postgres si hay DATABASE_URL, si no SQLite local). Idempotente.
 * Uso: npm run data:ingest            (INGEST_FORCE=1 recarga también archivos sin cambios)
 */
import { existsSync } from "node:fs";
import path from "node:path";
import { openDb } from "../src/lib/db/client.ts";
import { ingestWfb } from "../src/lib/ingest/load.ts";

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
await db.close();
