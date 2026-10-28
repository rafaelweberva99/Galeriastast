/**
 * Carga de partidos de la fuente "wfb" (archivos Football.TXT) en la base.
 * Idempotente y por lotes, para que sea rápida también contra un Postgres remoto:
 * los archivos sin cambios (mismo sha256 ya registrado) se omiten salvo `force`.
 */
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { Db, Param } from "../db/client.ts";
import { matchId, type TeamResolver } from "../domain/normalize.ts";
import { externalTeamId, loadCatalog, readJson } from "./catalog.ts";
import { isFinalRound, parseFootballTxt, roundToSpanish, stageToSpanish } from "./footballtxt.ts";
import { applyCorrections, loadCorrections } from "./quality.ts";

interface FileCfg {
  competition: string;
  onlyChilean?: boolean;
}

export interface IngestReport {
  files: { file: string; loaded: number; skipped: number; unchanged: boolean }[];
  total: number;
  corrections: { applied: number; of: number };
  unknownTeams: string[];
}

const BATCH = 250;
const MATCH_COLUMNS = 15;

/** "Colo-Colo (CHI)" -> { name: "Colo-Colo", country: "CHI" } */
function splitCountry(raw: string): { name: string; country: string | null } {
  const m = raw.match(/^(.*) \(([A-Z]{3})\)$/);
  return m ? { name: m[1], country: m[2] } : { name: raw, country: null };
}

async function upsertMatches(db: Db, rows: Param[][]): Promise<void> {
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const values = chunk.map(() => `(${Array(MATCH_COLUMNS).fill("?").join(", ")})`).join(", ");
    await db.run(
      `INSERT INTO matches (id, date, season, competition_id, tournament, stage, home_team_id, away_team_id,
                            home_goals, away_goals, home_pens, away_pens, is_final, source, source_ref)
       VALUES ${values}
       ON CONFLICT (id) DO UPDATE SET season = excluded.season, competition_id = excluded.competition_id,
         tournament = excluded.tournament, stage = excluded.stage, home_goals = excluded.home_goals,
         away_goals = excluded.away_goals, home_pens = excluded.home_pens, away_pens = excluded.away_pens,
         is_final = excluded.is_final, source_ref = excluded.source_ref`,
      ...chunk.flat(),
    );
  }
}

export async function ingestWfb(
  db: Db,
  rawDir: string,
  opts: { force?: boolean; log?: (line: string) => void } = {},
): Promise<IngestReport> {
  const log = opts.log ?? (() => {});
  const { wfb } = readJson<{ wfb: { files: Record<string, FileCfg> } }>("sources.json");
  const resolver: TeamResolver = await loadCatalog(db);
  const unknownTeams = new Set<string>();
  const report: IngestReport = { files: [], total: 0, corrections: { applied: 0, of: 0 }, unknownTeams: [] };

  const seen = new Set(
    (await db.all<{ file: string; sha256: string }>("SELECT file, sha256 FROM ingestion_runs WHERE source = 'wfb'")).map(
      (r) => `${r.file}:${r.sha256}`,
    ),
  );

  for (const file of readdirSync(rawDir).sort()) {
    const m = file.match(/^(.+?)_(.+)\.txt$/);
    const cfg = m && wfb.files[m[2]];
    if (!m || !cfg) continue;
    const text = readFileSync(path.join(rawDir, file), "utf8");
    const sha = createHash("sha256").update(text).digest("hex");
    if (!opts.force && seen.has(`${file}:${sha}`)) {
      report.files.push({ file, loaded: 0, skipped: 0, unchanged: true });
      log(`${file.padEnd(22)} sin cambios`);
      continue;
    }

    const seasonLabel = m[1];
    const parsed = parseFootballTxt(text);
    for (const w of parsed.warnings) log(`${file} ${w}`);

    const newTeams = new Map<string, { name: string; chilean: boolean }>();
    const teamId = (raw: string) => {
      const { name, country } = splitCountry(raw);
      const chilean = country === null || country === "CHI";
      const known = chilean ? resolver.resolve(name) : null;
      if (known) return { id: known, chilean };
      if (chilean) unknownTeams.add(name);
      const id = externalTeamId(name, chilean, country ?? undefined);
      newTeams.set(id, { name, chilean });
      return { id, chilean };
    };

    const rows = new Map<string, Param[]>();
    for (const pm of parsed.matches) {
      const home = teamId(pm.home);
      const away = teamId(pm.away);
      if (cfg.onlyChilean && !home.chilean && !away.chilean) continue;
      const stage = stageToSpanish(pm.stage);
      const id = matchId(pm.date, home.id, away.id);
      rows.set(id, [
        id,
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
        "wfb",
        `${file}#L${pm.line}`,
      ]);
    }

    await db.transaction(async (tx) => {
      for (const [id, t] of newTeams) {
        await tx.run(
          "INSERT INTO teams (id, name, short_name, is_chilean) VALUES (?, ?, ?, ?) ON CONFLICT (id) DO NOTHING",
          id,
          t.name,
          t.name,
          t.chilean ? 1 : 0,
        );
      }
      await upsertMatches(tx, [...rows.values()]);
      await tx.run(
        "INSERT INTO ingestion_runs (source, file, sha256, rows_read, rows_loaded) VALUES ('wfb', ?, ?, ?, ?)",
        file,
        sha,
        parsed.matches.length + parsed.skipped,
        rows.size,
      );
    });
    report.files.push({ file, loaded: rows.size, skipped: parsed.skipped, unchanged: false });
    report.total += rows.size;
    log(`${file.padEnd(22)} ${String(rows.size).padStart(4)} partidos (${parsed.skipped} sin resultado omitidos)`);
  }

  // La ingesta sobrescribe resultados, así que las correcciones confirmadas se reaplican siempre.
  const corrections = loadCorrections();
  report.corrections = {
    applied: await applyCorrections(db, corrections, (n) => resolver.resolve(n)),
    of: corrections.length,
  };
  report.unknownTeams = [...unknownTeams].sort();
  return report;
}
