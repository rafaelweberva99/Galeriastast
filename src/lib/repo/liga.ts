import type { Db } from "../db/client.ts";
import { clubRecords, type ClubRecords } from "../domain/records.ts";
import { listClubMatches } from "./matches.ts";
import { SELECCION_ID } from "./teams.ts";

export interface ScorerRow {
  player: string;
  goals: number;
  clubs: string[];
}

/**
 * Máximos goleadores de la Primera División en los partidos con goleadores cargados (sin autogoles).
 * Con teamId, solo los goles de ese equipo en cualquier competición (p. ej. la Selección).
 */
export async function topScorers(db: Db, opts: { limit?: number; teamId?: string } = {}): Promise<ScorerRow[]> {
  const limit = opts.limit ?? 10;
  const rows = opts.teamId
    ? await db.all(
        `SELECT g.player, COUNT(*) AS n FROM goals g WHERE g.own_goal = 0 AND g.team_id = ? GROUP BY g.player ORDER BY n DESC, g.player LIMIT ?`,
        opts.teamId,
        limit,
      )
    : await db.all(
        `SELECT g.player, COUNT(*) AS n FROM goals g JOIN matches m ON m.id = g.match_id
          WHERE g.own_goal = 0 AND m.competition_id = 'primera-division' GROUP BY g.player ORDER BY n DESC, g.player LIMIT ?`,
        limit,
      );
  const players = rows.map((r) => r.player as string);
  const clubsOf = new Map<string, string[]>();
  if (players.length && !opts.teamId) {
    const cr = await db.all(
      `SELECT g.player, t.short_name AS club, COUNT(*) AS n FROM goals g JOIN matches m ON m.id = g.match_id JOIN teams t ON t.id = g.team_id
        WHERE g.own_goal = 0 AND m.competition_id = 'primera-division' AND g.player IN (${players.map(() => "?").join(", ")})
        GROUP BY g.player, t.short_name ORDER BY n DESC`,
      ...players,
    );
    for (const r of cr) clubsOf.set(r.player as string, [...(clubsOf.get(r.player as string) ?? []), r.club as string]);
  }
  return rows.map((r) => ({ player: r.player as string, goals: Number(r.n), clubs: (clubsOf.get(r.player as string) ?? []).slice(0, 3) }));
}

export interface BigScore {
  date: string;
  tournament: string | null;
  home: string;
  away: string;
  homeGoals: number;
  awayGoals: number;
}

/** Mayores goleadas de la Primera División. */
export async function biggestScores(db: Db, limit = 5): Promise<BigScore[]> {
  const rows = await db.all(
    `SELECT m.date, m.tournament, th.short_name AS home, ta.short_name AS away, m.home_goals, m.away_goals
       FROM matches m JOIN teams th ON th.id = m.home_team_id JOIN teams ta ON ta.id = m.away_team_id
      WHERE m.competition_id = 'primera-division' AND m.home_goals IS NOT NULL
      ORDER BY ABS(m.home_goals - m.away_goals) DESC, (m.home_goals + m.away_goals) DESC, m.date DESC LIMIT ?`,
    limit,
  );
  return rows.map((r) => ({
    date: r.date as string,
    tournament: r.tournament as string | null,
    home: r.home as string,
    away: r.away as string,
    homeGoals: Number(r.home_goals),
    awayGoals: Number(r.away_goals),
  }));
}

const cache = new Map<string, { at: number; value: ClubRecords }>();
const TTL = 30 * 60_000;

/** Récords de un club en la Primera División (se guardan 30 minutos: recorre ~1.000 partidos). */
export async function primeraRecords(db: Db, clubId: string): Promise<ClubRecords> {
  const hit = cache.get(clubId);
  if (hit && Date.now() - hit.at < TTL) return hit.value;
  const matches = await listClubMatches(db, clubId, { competitionId: "primera-division", limit: 5000 });
  const value = clubRecords(matches, clubId);
  cache.set(clubId, { at: Date.now(), value });
  return value;
}

export interface TopFan {
  username: string;
  clubName: string;
  attended: number;
}

/** Hinchas públicos que más partidos han marcado (liga y Selección, solo partidos ya jugados). */
export async function topFans(db: Db, limit = 10): Promise<TopFan[]> {
  const rows = await db.all(
    `SELECT u.username, t.name AS club_name, COUNT(m.id) AS n
       FROM users u JOIN teams t ON t.id = u.club_id
       JOIN attendances a ON a.user_id = u.id
       JOIN matches m ON m.id = a.match_id AND m.date <= ?
      WHERE u.is_public = 1
      GROUP BY u.id, u.username, t.name HAVING COUNT(m.id) > 0
      ORDER BY n DESC, u.username LIMIT ?`,
    new Date().toISOString().slice(0, 10),
    limit,
  );
  return rows.map((r) => ({ username: r.username as string, clubName: r.club_name as string, attended: Number(r.n) }));
}

export { SELECCION_ID };
