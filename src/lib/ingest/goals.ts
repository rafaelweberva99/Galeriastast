/**
 * Carga de goleadores por partido.
 *
 * Formato (goals.csv y data/goal-corrections.csv):
 *   match_id,date,home_team_id,away_team_id,scoring_team_id,player,minute,own_goal,penalty,source
 * - scoring_team_id: equipo al que se le suma el gol (en un autogol, el beneficiado).
 * - Las correcciones reemplazan la lista completa de goles de cada partido que mencionan.
 * - players: alias -> nombre canónico, para unificar variantes del mismo jugador.
 */
import type { Db, Param } from "../db/client.ts";
import { goalsComplete } from "../domain/scorers.ts";
import type { Goal, Match } from "../domain/types.ts";
import { toMatch } from "../repo/matches.ts";
import { parseCsv } from "./csv.ts";

export interface GoalRow {
  matchId: string;
  teamId: string;
  player: string;
  minute: number | null;
  ownGoal: boolean;
  penalty: boolean;
  source: string;
}

export interface GoalsReport {
  rows: number;
  matches: number;
  complete: number;
  incomplete: string[];
  rejected: string[];
}

const truthy = (v: string | undefined) => v === "1" || v?.toLowerCase() === "true";

export function parseGoalsCsv(text: string, canonical: Map<string, string> = new Map()): GoalRow[] {
  return parseCsv(text).map((r) => {
    const minute = r.minute ? Number.parseInt(r.minute, 10) : NaN;
    const player = r.player.replace(/\s+/g, " ").trim();
    return {
      matchId: r.match_id,
      teamId: r.scoring_team_id,
      player: canonical.get(player) ?? player,
      minute: Number.isFinite(minute) ? minute : null,
      ownGoal: truthy(r.own_goal),
      penalty: truthy(r.penalty),
      source: r.source || "desconocida",
    };
  });
}

/** players.csv (player,canonical_name,notes) -> mapa de alias. */
export function parsePlayersCsv(text: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const r of parseCsv(text)) if (r.player && r.canonical_name) map.set(r.player.trim(), r.canonical_name.trim());
  return map;
}

/**
 * Reemplaza los goles de cada partido presente en `rows` (las correcciones pisan a la fuente).
 * Rechaza filas de partidos inexistentes o con un equipo que no jugó ese partido.
 */
export async function loadGoals(
  db: Db,
  rows: GoalRow[],
  corrections: GoalRow[] = [],
  verifiedMatches: Set<string> = new Set(),
): Promise<GoalsReport> {
  const corrected = new Set(corrections.map((r) => r.matchId));
  const all = [...rows.filter((r) => !corrected.has(r.matchId)), ...corrections];

  const byMatch = new Map<string, GoalRow[]>();
  for (const r of all) byMatch.set(r.matchId, [...(byMatch.get(r.matchId) ?? []), r]);

  const ids = [...byMatch.keys()];
  const matches = new Map<string, Match>();
  for (let i = 0; i < ids.length; i += 500) {
    const chunk = ids.slice(i, i + 500);
    const found = await db.all(
      `SELECT m.*, c.name AS competition_name, c.kind AS competition_kind, ht.name AS home_team_name,
              at.name AS away_team_name, NULL AS venue_name
       FROM matches m JOIN competitions c ON c.id = m.competition_id
       JOIN teams ht ON ht.id = m.home_team_id JOIN teams at ON at.id = m.away_team_id
       WHERE m.id IN (${chunk.map(() => "?").join(", ")})`,
      ...chunk,
    );
    for (const r of found) matches.set(r.id as string, toMatch(r));
  }

  const report: GoalsReport = { rows: 0, matches: 0, complete: 0, incomplete: [], rejected: [] };
  const insert: Param[][] = [];
  for (const [id, goals] of byMatch) {
    const m = matches.get(id);
    if (!m) {
      report.rejected.push(`${id}: el partido no existe en la base`);
      continue;
    }
    const bad = goals.find((g) => g.teamId !== m.homeTeamId && g.teamId !== m.awayTeamId);
    if (bad) {
      report.rejected.push(`${id}: ${bad.player} figura con un equipo que no jugó (${bad.teamId})`);
      continue;
    }
    const domainGoals: Goal[] = goals.map((g) => ({ ...g }));
    if (goalsComplete(m, domainGoals)) report.complete++;
    else report.incomplete.push(`${id}: ${goals.length} goles en la lista vs marcador ${m.homeGoals}-${m.awayGoals}`);
    report.matches++;
    for (const g of goals) {
      insert.push([
        id,
        g.teamId,
        g.player,
        g.minute,
        g.ownGoal ? 1 : 0,
        g.penalty ? 1 : 0,
        g.source,
        corrected.has(id) || verifiedMatches.has(id) ? 1 : 0,
      ]);
    }
  }

  const loadedIds = [...new Set(insert.map((r) => r[0] as string))];
  await db.transaction(async (tx) => {
    for (let i = 0; i < loadedIds.length; i += 500) {
      const chunk = loadedIds.slice(i, i + 500);
      await tx.run(`DELETE FROM goals WHERE match_id IN (${chunk.map(() => "?").join(", ")})`, ...chunk);
    }
    for (let i = 0; i < insert.length; i += 250) {
      const chunk = insert.slice(i, i + 250);
      await tx.run(
        `INSERT INTO goals (match_id, team_id, player, minute, own_goal, penalty, source, verified)
         VALUES ${chunk.map(() => "(?, ?, ?, ?, ?, ?, ?, ?)").join(", ")}`,
        ...chunk.flat(),
      );
    }
  });
  report.rows = insert.length;
  return report;
}
