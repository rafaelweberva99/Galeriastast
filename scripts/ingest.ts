/**
 * Carga el catálogo (clubes, competiciones, clásicos) y los partidos de data/raw/wfb/ en la base.
 * Idempotente: reejecutarlo actualiza los registros existentes.
 * Uso: npm run data:ingest
 */
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { openDb } from "../src/lib/db/client.ts";
import { matchId } from "../src/lib/domain/normalize.ts";
import { ensureTeam, loadCatalog, readJson } from "../src/lib/ingest/catalog.ts";
import { applyCorrections, loadCorrections } from "../src/lib/ingest/quality.ts";
import { isFinalRound, parseFootballTxt, roundToSpanish, stageToSpanish } from "../src/lib/ingest/footballtxt.ts";

interface FileCfg {
  competition: string;
  onlyChilean?: boolean;
}

const { wfb } = readJson<{ wfb: { files: Record<string, FileCfg> } }>("sources.json");
const rawDir = path.resolve("data/raw/wfb");
if (!existsSync(rawDir)) {
  console.error("No hay datos crudos. Ejecuta primero: npm run data:fetch");
  process.exit(1);
}

const db = openDb();
const resolver = loadCatalog(db);
const unknownTeams = new Map<string, number>();

/** "Colo-Colo (CHI)" -> { name: "Colo-Colo", country: "CHI" } */
function splitCountry(raw: string): { name: string; country: string | null } {
  const m = raw.match(/^(.*) \(([A-Z]{3})\)$/);
  return m ? { name: m[1], country: m[2] } : { name: raw, country: null };
}

function teamId(raw: string): { id: string; chilean: boolean } {
  const { name, country } = splitCountry(raw);
  const chilean = country === null || country === "CHI";
  if (!chilean) return { id: ensureTeam(db, name, false, country!), chilean };
  const known = resolver.resolve(name);
  if (known) return { id: known, chilean };
  unknownTeams.set(name, (unknownTeams.get(name) ?? 0) + 1);
  return { id: ensureTeam(db, name, true), chilean };
}

const upsert = db.prepare(`
  INSERT INTO matches (id, date, season, competition_id, tournament, stage, home_team_id, away_team_id,
                       home_goals, away_goals, home_pens, away_pens, venue_id, is_final, source, source_ref)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, 'wfb', ?)
  ON CONFLICT(id) DO UPDATE SET season = excluded.season, competition_id = excluded.competition_id,
    tournament = excluded.tournament, stage = excluded.stage, home_goals = excluded.home_goals,
    away_goals = excluded.away_goals, home_pens = excluded.home_pens, away_pens = excluded.away_pens,
    is_final = excluded.is_final, source_ref = excluded.source_ref`);

let total = 0;
db.exec("BEGIN");
try {
  for (const file of readdirSync(rawDir).sort()) {
    const m = file.match(/^(.+?)_(.+)\.txt$/);
    const cfg = m && wfb.files[m[2]];
    if (!m || !cfg) continue;
    const seasonLabel = m[1];
    const text = readFileSync(path.join(rawDir, file), "utf8");
    const parsed = parseFootballTxt(text);
    for (const w of parsed.warnings) console.warn(`${file} ${w}`);

    let loaded = 0;
    for (const pm of parsed.matches) {
      const home = teamId(pm.home);
      const away = teamId(pm.away);
      if (cfg.onlyChilean && !home.chilean && !away.chilean) continue;
      const stage = stageToSpanish(pm.stage);
      upsert.run(
        matchId(pm.date, home.id, away.id),
        pm.date,
        Number(pm.date.slice(0, 4)),
        cfg.competition,
        stage ? `${stage} ${seasonLabel}` : seasonLabel,
        roundToSpanish(pm.round),
        home.id,
        away.id,
        pm.homeGoals,
        pm.awayGoals,
        pm.homePens,
        pm.awayPens,
        isFinalRound(pm.stage, pm.round) ? 1 : 0,
        `${file}#L${pm.line}`,
      );
      loaded++;
    }
    db.prepare("INSERT INTO ingestion_runs (source, file, sha256, rows_read, rows_loaded) VALUES ('wfb', ?, ?, ?, ?)").run(
      file,
      createHash("sha256").update(text).digest("hex"),
      parsed.matches.length + parsed.skipped,
      loaded,
    );
    total += loaded;
    console.log(`${file.padEnd(22)} ${String(loaded).padStart(4)} partidos (${parsed.skipped} sin resultado omitidos)`);
  }
  db.exec("COMMIT");
} catch (e) {
  db.exec("ROLLBACK");
  throw e;
}

// La ingesta sobrescribe resultados, así que las correcciones confirmadas se reaplican siempre.
const corrections = loadCorrections();
const applied = applyCorrections(db, corrections, (n) => resolver.resolve(n));
console.log(`\nTotal: ${total} partidos cargados; ${applied} de ${corrections.length} correcciones aplicadas.`);
if (unknownTeams.size) {
  console.log(`${unknownTeams.size} clubes chilenos fuera del catálogo (creados automáticamente; agrega alias en data/catalog/teams.json si corresponde):`);
  console.log([...unknownTeams.keys()].sort().join(", "));
}
