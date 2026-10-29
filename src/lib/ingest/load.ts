/**
 * Carga de partidos de la fuente "wfb" (archivos Football.TXT) en la base.
 * Idempotente y por lotes, para que sea rápida también contra un Postgres remoto:
 * los archivos sin cambios (mismo sha256 ya registrado) se omiten salvo `force`.
 */
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { Db, Param } from "../db/client.ts";
import { matchId, slugify, type TeamResolver } from "../domain/normalize.ts";
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

/** Clubes extranjeros que cambiaron de nombre (data/catalog/foreign-aliases.json): se usa el actual. */
const FOREIGN_ALIASES: Record<string, string> = readJson<{ aliases: Record<string, string> }>("catalog/foreign-aliases.json").aliases;

/** "Colo-Colo (CHI)" -> { name: "Colo-Colo", country: "CHI" } */
function splitCountry(raw: string): { name: string; country: string | null } {
  const m = (FOREIGN_ALIASES[raw] ?? raw).match(/^(.*) \(([A-Z]{3})\)$/);
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

// ----------------------------------------------------------------------------
// Partidos en CSV normalizado (data/matches/*.csv): temporadas recientes y competiciones
// que la fuente principal no cubre, armadas desde varias fuentes y verificadas por agentes.
//   date,competition_id,season,tournament,stage,home,away,home_goals,away_goals,home_pens,away_pens,is_final,venue,source

const intOrNull = (v: string | undefined) => {
  const n = v === undefined || v.trim() === "" ? NaN : Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
};

export async function ingestMatchesCsv(
  db: Db,
  file: string,
  text: string,
  resolver: TeamResolver,
): Promise<{ loaded: number; unknownTeams: string[]; rejected: string[] }> {
  const { parseCsv } = await import("./csv.ts");
  const competitions = new Set((await db.all<{ id: string }>("SELECT id FROM competitions")).map((c) => c.id));
  const unknownTeams = new Set<string>();
  const rejected: string[] = [];
  const newTeams = new Map<string, { name: string; chilean: boolean }>();
  const team = (raw: string) => {
    const { name, country } = splitCountry(raw.trim());
    const chilean = country === null || country === "CHI";
    // Solo los clubes chilenos se buscan en el catálogo: "Universidad Católica (ECU)" no es la UC.
    const known = chilean ? resolver.resolve(name) : null;
    if (known) return known;
    if (chilean) unknownTeams.add(name);
    const id = externalTeamId(name, chilean, country ?? undefined);
    newTeams.set(id, { name, chilean });
    return id;
  };

  const rows = new Map<string, Param[]>();
  const venues = new Map<string, string>(); // venue_id -> nombre
  const matchVenue = new Map<string, string>(); // match_id -> venue_id
  for (const [i, r] of parseCsv(text).entries()) {
    const where = `${path.basename(file)}#${i + 2}`;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.date ?? "")) {
      rejected.push(`${where}: fecha inválida "${r.date}"`);
      continue;
    }
    if (!competitions.has(r.competition_id)) {
      rejected.push(`${where}: competición desconocida "${r.competition_id}"`);
      continue;
    }
    const home = team(r.home);
    const away = team(r.away);
    if (home === away) {
      rejected.push(`${where}: local y visita iguales`);
      continue;
    }
    const hg = intOrNull(r.home_goals);
    const ag = intOrNull(r.away_goals);
    if ((hg === null) !== (ag === null)) {
      rejected.push(`${where}: marcador incompleto`);
      continue;
    }
    const id = matchId(r.date, home, away);
    const venueName = (r.venue ?? "").trim();
    if (venueName) {
      const vid = slugify(venueName);
      venues.set(vid, venueName);
      matchVenue.set(id, vid);
    }
    rows.set(id, [
      id,
      r.date,
      intOrNull(r.season) ?? Number(r.date.slice(0, 4)),
      r.competition_id,
      r.tournament || null,
      r.stage || null,
      home,
      away,
      hg,
      ag,
      intOrNull(r.home_pens),
      intOrNull(r.away_pens),
      r.is_final === "1" ? 1 : 0,
      "csv",
      r.source ? r.source.slice(0, 300) : where,
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
    for (const [vid, name] of venues) {
      await tx.run("INSERT INTO venues (id, name) VALUES (?, ?) ON CONFLICT (id) DO UPDATE SET name = excluded.name", vid, name);
    }
    for (const [mid, vid] of matchVenue) await tx.run("UPDATE matches SET venue_id = ? WHERE id = ?", vid, mid);
  });
  return { loaded: rows.size, unknownTeams: [...unknownTeams].sort(), rejected };
}

// ----------------------------------------------------------------------------
// Clubes extranjeros renombrados: los partidos ya cargados con el nombre antiguo (y lo que los
// hinchas marcaron en ellos) pasan al nombre actual. Idempotente: si no queda nada antiguo, no hace nada.

export async function migrateForeignAliases(db: Db): Promise<number> {
  let moved = 0;
  for (const [oldRaw, newRaw] of Object.entries(FOREIGN_ALIASES)) {
    const [o, n] = [oldRaw, newRaw].map((raw) => raw.match(/^(.*) \(([A-Z]{3})\)$/));
    if (!o || !n) continue;
    const oldId = externalTeamId(o[1], false, o[2]);
    const newId = externalTeamId(n[1], false, n[2]);
    const old = await db.all<{ id: string; date: string; home_team_id: string; away_team_id: string }>(
      "SELECT id, date, home_team_id, away_team_id FROM matches WHERE home_team_id = ? OR away_team_id = ?",
      oldId,
      oldId,
    );
    if (!old.length && !(await db.get("SELECT 1 AS x FROM teams WHERE id = ?", oldId))) continue;
    await db.transaction(async (tx) => {
      await tx.run(
        "INSERT INTO teams (id, name, short_name, is_chilean) VALUES (?, ?, ?, 0) ON CONFLICT (id) DO NOTHING",
        newId,
        n[1],
        n[1],
      );
      for (const m of old) {
        const home = m.home_team_id === oldId ? newId : m.home_team_id;
        const away = m.away_team_id === oldId ? newId : m.away_team_id;
        const id = matchId(m.date, home, away);
        await tx.run(
          `INSERT INTO matches (id, date, season, competition_id, tournament, stage, home_team_id, away_team_id, home_goals,
                                away_goals, home_pens, away_pens, venue_id, is_final, source, source_ref, verified)
           SELECT ?, date, season, competition_id, tournament, stage, ?, ?, home_goals, away_goals, home_pens, away_pens,
                  venue_id, is_final, source, source_ref, verified
             FROM matches WHERE id = ?
           ON CONFLICT (id) DO NOTHING`,
          id,
          home,
          away,
          m.id,
        );
        await tx.run(
          `UPDATE attendances SET match_id = ? WHERE match_id = ?
             AND user_id NOT IN (SELECT user_id FROM attendances WHERE match_id = ?)`,
          id,
          m.id,
          id,
        );
        await tx.run("DELETE FROM attendances WHERE match_id = ?", m.id);
        await tx.run("UPDATE goals SET match_id = ? WHERE match_id = ?", id, m.id);
        await tx.run("DELETE FROM matches WHERE id = ?", m.id);
        moved++;
      }
      await tx.run("UPDATE goals SET team_id = ? WHERE team_id = ?", newId, oldId);
      await tx.run("DELETE FROM teams WHERE id = ?", oldId);
    });
  }
  return moved;
}
