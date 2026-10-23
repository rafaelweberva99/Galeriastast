import type { Db } from "../db/client.ts";

export interface Issue {
  check: string;
  severity: "error" | "warning";
  detail: string;
}

type Row = Record<string, unknown>;

/** Chequeos de consistencia interna sobre los partidos cargados. */
export function runQualityChecks(db: Db, today = new Date().toISOString().slice(0, 10)): Issue[] {
  const issues: Issue[] = [];
  const add = (check: string, severity: Issue["severity"], rows: Row[], fmt: (r: Row) => string) =>
    rows.forEach((r) => issues.push({ check, severity, detail: fmt(r) }));

  add(
    "equipo-dos-veces-mismo-dia",
    "error",
    db
      .prepare(
        `SELECT team, date, COUNT(*) AS n FROM (
           SELECT home_team_id AS team, date FROM matches UNION ALL SELECT away_team_id, date FROM matches)
         GROUP BY team, date HAVING n > 1`,
      )
      .all() as Row[],
    (r) => `${r.team} figura en ${r.n} partidos el ${r.date}`,
  );

  add(
    "local-igual-visita",
    "error",
    db.prepare("SELECT id FROM matches WHERE home_team_id = away_team_id").all() as Row[],
    (r) => `${r.id}`,
  );

  add(
    "marcador-improbable",
    "warning",
    db.prepare("SELECT id, home_goals, away_goals FROM matches WHERE home_goals + away_goals > 12").all() as Row[],
    (r) => `${r.id}: ${r.home_goals}-${r.away_goals}`,
  );

  // Nota: en llaves de ida y vuelta puede haber penales tras un partido no empatado
  // (se define por el global), por eso no se exige empate cuando hay penales.
  add(
    "penales-sin-marcador",
    "warning",
    db.prepare("SELECT id FROM matches WHERE home_pens IS NOT NULL AND home_goals IS NULL").all() as Row[],
    (r) => `${r.id}: definición a penales sin marcador del partido`,
  );

  add(
    "partido-futuro-con-resultado",
    "error",
    db.prepare("SELECT id FROM matches WHERE date > ? AND home_goals IS NOT NULL").all(today) as Row[],
    (r) => `${r.id}`,
  );

  // En una liga todos contra todos, cada equipo juega la misma cantidad de partidos por torneo.
  add(
    "partidos-desparejos-en-torneo",
    "warning",
    db
      .prepare(
        `WITH apps AS (
           SELECT tournament, home_team_id AS team FROM matches WHERE competition_id = 'primera-division' AND stage LIKE 'Fecha %'
           UNION ALL
           SELECT tournament, away_team_id FROM matches WHERE competition_id = 'primera-division' AND stage LIKE 'Fecha %'),
         counts AS (SELECT tournament, team, COUNT(*) AS n FROM apps GROUP BY tournament, team)
         SELECT tournament, MIN(n) AS min_n, MAX(n) AS max_n, COUNT(*) AS teams FROM counts
         GROUP BY tournament HAVING MIN(n) <> MAX(n)`,
      )
      .all() as Row[],
    (r) => `${r.tournament}: ${r.teams} equipos, entre ${r.min_n} y ${r.max_n} partidos de fase regular`,
  );

  return issues;
}

export interface Correction {
  date: string;
  home: string;
  away: string;
  field: "home_goals" | "away_goals" | "home_pens" | "away_pens" | "date" | "delete";
  correctValue: string;
}

const CORRECTABLE = new Set(["home_goals", "away_goals", "home_pens", "away_pens", "date"]);

/** Aplica correcciones confirmadas por el verificador. Devuelve cuántas se aplicaron. */
export function applyCorrections(db: Db, corrections: Correction[], resolve: (name: string) => string | null): number {
  let applied = 0;
  for (const c of corrections) {
    const home = resolve(c.home);
    const away = resolve(c.away);
    if (!home || !away) continue;
    const id = `${c.date}_${home}_${away}`;
    if (c.field === "delete") {
      applied += Number(db.prepare("DELETE FROM matches WHERE id = ?").run(id).changes);
      continue;
    }
    if (!CORRECTABLE.has(c.field)) continue;
    const value = c.field === "date" ? c.correctValue : Number(c.correctValue);
    const res = db.prepare(`UPDATE matches SET ${c.field} = ?, verified = 1 WHERE id = ?`).run(value, id);
    if (c.field === "date" && res.changes) {
      db.prepare("UPDATE matches SET id = ? WHERE id = ?").run(`${c.correctValue}_${home}_${away}`, id);
    }
    applied += Number(res.changes);
  }
  return applied;
}

export interface CrossCheckRow {
  date: string;
  home: string;
  away: string;
  homeGoals: number;
  awayGoals: number;
}

/**
 * Contrasta contra una segunda fuente independiente: los partidos con mismo resultado
 * (tolerando ±1 día por diferencias de huso horario) quedan marcados como verificados.
 */
export function crossCheck(
  db: Db,
  rows: CrossCheckRow[],
  resolve: (name: string) => string | null,
): { matched: number; mismatched: string[]; notFound: number } {
  let matched = 0;
  let notFound = 0;
  const mismatched: string[] = [];
  const find = db.prepare(
    `SELECT id, home_goals, away_goals FROM matches
     WHERE home_team_id = ? AND away_team_id = ? AND ABS(julianday(date) - julianday(?)) <= 1`,
  );
  const mark = db.prepare("UPDATE matches SET verified = 1 WHERE id = ?");
  for (const r of rows) {
    const home = resolve(r.home);
    const away = resolve(r.away);
    const m = home && away ? (find.get(home, away, r.date) as Row | undefined) : undefined;
    if (!m) {
      notFound++;
      continue;
    }
    if (Number(m.home_goals) === r.homeGoals && Number(m.away_goals) === r.awayGoals) {
      mark.run(m.id as string);
      matched++;
    } else {
      mismatched.push(`${m.id}: base ${m.home_goals}-${m.away_goals} vs segunda fuente ${r.homeGoals}-${r.awayGoals}`);
    }
  }
  return { matched, mismatched, notFound };
}
