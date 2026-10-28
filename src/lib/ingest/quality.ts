import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { Db, Row } from "../db/client.ts";
import { parseCsv } from "./csv.ts";

export interface Issue {
  check: string;
  severity: "error" | "warning";
  detail: string;
}

/** Chequeos de consistencia interna sobre los partidos cargados. */
export async function runQualityChecks(db: Db, today = new Date().toISOString().slice(0, 10)): Promise<Issue[]> {
  const issues: Issue[] = [];
  const add = (check: string, severity: Issue["severity"], rows: Row[], fmt: (r: Row) => string) =>
    rows.forEach((r) => issues.push({ check, severity, detail: fmt(r) }));

  // Dos partidos el mismo día en la misma competición es imposible; entre competiciones distintas
  // ocurre (p.ej. Huachipato jugó liga y Copa Chile el 8-9-2024 con planteles distintos).
  const sameDay = await db.all(
    `SELECT team, date, COUNT(*) AS n, COUNT(DISTINCT competition_id) AS comps FROM (
       SELECT home_team_id AS team, date, competition_id FROM matches
       UNION ALL SELECT away_team_id, date, competition_id FROM matches) AS apps
     GROUP BY team, date HAVING COUNT(*) > 1`,
  );
  const fmtSameDay = (r: Row) => `${r.team} figura en ${r.n} partidos el ${r.date}`;
  add("equipo-dos-veces-mismo-dia", "error", sameDay.filter((r) => Number(r.comps) < Number(r.n)), fmtSameDay);
  add("jornada-doble-otra-competicion", "warning", sameDay.filter((r) => Number(r.comps) === Number(r.n)), fmtSameDay);

  add(
    "local-igual-visita",
    "error",
    await db.all("SELECT id FROM matches WHERE home_team_id = away_team_id"),
    (r) => `${r.id}`,
  );

  add(
    "marcador-improbable",
    "warning",
    await db.all("SELECT id, home_goals, away_goals FROM matches WHERE home_goals + away_goals > 12"),
    (r) => `${r.id}: ${r.home_goals}-${r.away_goals}`,
  );

  // Nota: en llaves de ida y vuelta puede haber penales tras un partido no empatado
  // (se define por el global), por eso no se exige empate cuando hay penales.
  add(
    "penales-sin-marcador",
    "warning",
    await db.all("SELECT id FROM matches WHERE home_pens IS NOT NULL AND home_goals IS NULL"),
    (r) => `${r.id}: definición a penales sin marcador del partido`,
  );

  add(
    "partido-futuro-con-resultado",
    "error",
    await db.all("SELECT id FROM matches WHERE date > ? AND home_goals IS NOT NULL", today),
    (r) => `${r.id}`,
  );

  // En una liga todos contra todos, cada equipo juega la misma cantidad de partidos por torneo.
  add(
    "partidos-desparejos-en-torneo",
    "warning",
    await db.all(
      `WITH apps AS (
           SELECT tournament, home_team_id AS team FROM matches WHERE competition_id = 'primera-division' AND stage LIKE 'Fecha %'
           UNION ALL
           SELECT tournament, away_team_id FROM matches WHERE competition_id = 'primera-division' AND stage LIKE 'Fecha %'),
         counts AS (SELECT tournament, team, COUNT(*) AS n FROM apps GROUP BY tournament, team)
         SELECT tournament, MIN(n) AS min_n, MAX(n) AS max_n, COUNT(*) AS teams FROM counts
         GROUP BY tournament HAVING MIN(n) <> MAX(n)`,
    ),
    (r) => `${r.tournament}: ${r.teams} equipos, entre ${r.min_n} y ${r.max_n} partidos de fase regular`,
  );

  add(
    "goles-no-cuadran",
    "warning",
    await db.all(
      `SELECT m.id, m.home_goals, m.away_goals,
              SUM(CASE WHEN g.team_id = m.home_team_id THEN 1 ELSE 0 END) AS hg,
              SUM(CASE WHEN g.team_id = m.away_team_id THEN 1 ELSE 0 END) AS ag
       FROM matches m JOIN goals g ON g.match_id = m.id
       GROUP BY m.id, m.home_goals, m.away_goals
       HAVING SUM(CASE WHEN g.team_id = m.home_team_id THEN 1 ELSE 0 END) <> m.home_goals
           OR SUM(CASE WHEN g.team_id = m.away_team_id THEN 1 ELSE 0 END) <> m.away_goals`,
    ),
    (r) => `${r.id}: goleadores ${r.hg}-${r.ag} vs marcador ${r.home_goals}-${r.away_goals}`,
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

/** Lee data/corrections.csv (date,home,away,field,source_value,correct_value,evidence_url). */
export function loadCorrections(file = path.resolve(process.cwd(), "data/corrections.csv")): Correction[] {
  if (!existsSync(file)) return [];
  return parseCsv(readFileSync(file, "utf8")).map((r) => ({
    date: r.date,
    home: r.home,
    away: r.away,
    field: r.field as Correction["field"],
    correctValue: r.correct_value,
  }));
}

const CORRECTABLE = new Set(["home_goals", "away_goals", "home_pens", "away_pens", "date"]);

/** Aplica correcciones confirmadas por el verificador. Devuelve cuántas se aplicaron. */
export async function applyCorrections(
  db: Db,
  corrections: Correction[],
  resolve: (name: string) => string | null,
): Promise<number> {
  let applied = 0;
  for (const c of corrections) {
    const home = resolve(c.home);
    const away = resolve(c.away);
    if (!home || !away) continue;
    const id = `${c.date}_${home}_${away}`;
    if (c.field === "delete") {
      applied += await db.run("DELETE FROM matches WHERE id = ?", id);
      continue;
    }
    if (!CORRECTABLE.has(c.field)) continue;
    const value = c.field === "date" ? c.correctValue : Number(c.correctValue);
    const changes = await db.run(`UPDATE matches SET ${c.field} = ?, verified = 1 WHERE id = ?`, value, id);
    if (c.field === "date" && changes) {
      await db.run("UPDATE matches SET id = ? WHERE id = ?", `${c.correctValue}_${home}_${away}`, id);
    }
    applied += changes;
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

const shiftDay = (iso: string, days: number) =>
  new Date(Date.parse(`${iso}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);

/**
 * Contrasta contra una segunda fuente independiente: los partidos con mismo resultado
 * (tolerando ±1 día por diferencias de huso horario) quedan marcados como verificados.
 */
export async function crossCheck(
  db: Db,
  rows: CrossCheckRow[],
  resolve: (name: string) => string | null,
): Promise<{ matched: number; mismatched: string[]; notFound: number }> {
  let matched = 0;
  let notFound = 0;
  const mismatched: string[] = [];
  for (const r of rows) {
    const home = resolve(r.home);
    const away = resolve(r.away);
    const m: Row | undefined =
      home && away
        ? await db.get(
            `SELECT id, home_goals, away_goals FROM matches
             WHERE home_team_id = ? AND away_team_id = ? AND date BETWEEN ? AND ?`,
            home,
            away,
            shiftDay(r.date, -1),
            shiftDay(r.date, 1),
          )
        : undefined;
    if (!m) {
      notFound++;
      continue;
    }
    if (Number(m.home_goals) === r.homeGoals && Number(m.away_goals) === r.awayGoals) {
      await db.run("UPDATE matches SET verified = 1 WHERE id = ?", m.id as string);
      matched++;
    } else {
      mismatched.push(`${m.id}: base ${m.home_goals}-${m.away_goals} vs segunda fuente ${r.homeGoals}-${r.awayGoals}`);
    }
  }
  return { matched, mismatched, notFound };
}
