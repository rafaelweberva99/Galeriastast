import type { Db } from "../db/client.ts";
import type { CrowdFan, H2HMatch } from "../domain/matchPage.ts";
import type { Rivalry } from "../domain/types.ts";
import { listRivalries } from "./teams.ts";

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Hinchas con perfil público que marcaron el partido, cada uno con el historial de su club
 * (partidos jugados / ganados / empatados entre todos los que marcó). Solo se devuelven datos
 * anónimos: ni nombres ni ids. El mínimo k ≥ 5 se aplica en `summarizeCrowd`.
 */
export async function matchCrowd(db: Db, matchId: string): Promise<CrowdFan[]> {
  const rows = await db.all(
    `SELECT u.club_id,
       COALESCE(SUM(CASE WHEN m.home_goals IS NOT NULL AND (m.home_team_id = u.club_id OR m.away_team_id = u.club_id) THEN 1 ELSE 0 END), 0) AS played,
       COALESCE(SUM(CASE WHEN m.home_goals IS NOT NULL AND
             ((m.home_team_id = u.club_id AND m.home_goals > m.away_goals) OR
              (m.away_team_id = u.club_id AND m.away_goals > m.home_goals)) THEN 1 ELSE 0 END), 0) AS won,
       COALESCE(SUM(CASE WHEN m.home_goals IS NOT NULL AND (m.home_team_id = u.club_id OR m.away_team_id = u.club_id)
             AND m.home_goals = m.away_goals THEN 1 ELSE 0 END), 0) AS drawn
     FROM users u
     JOIN attendances a0 ON a0.user_id = u.id AND a0.match_id = ?
     LEFT JOIN attendances a ON a.user_id = u.id
     LEFT JOIN matches m ON m.id = a.match_id AND m.date <= ?
     WHERE u.is_public = 1
     GROUP BY u.id, u.club_id`,
    matchId,
    today(),
  );
  return rows.map((r) => ({
    clubId: r.club_id as string,
    played: Number(r.played),
    won: Number(r.won),
    drawn: Number(r.drawn),
  }));
}

/** Todos los partidos entre dos equipos (livianos: solo lo que usa el historial). */
export async function matchesBetween(db: Db, a: string, b: string): Promise<H2HMatch[]> {
  const rows = await db.all(
    `SELECT m.id, m.date, m.season, m.home_team_id, m.away_team_id, m.home_goals, m.away_goals, m.home_pens, m.away_pens,
            c.name AS competition_name
       FROM matches m JOIN competitions c ON c.id = m.competition_id
      WHERE (m.home_team_id = ? AND m.away_team_id = ?) OR (m.home_team_id = ? AND m.away_team_id = ?)
      ORDER BY m.date DESC`,
    a,
    b,
    b,
    a,
  );
  const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));
  return rows.map((r) => ({
    id: r.id as string,
    date: r.date as string,
    season: Number(r.season),
    homeTeamId: r.home_team_id as string,
    awayTeamId: r.away_team_id as string,
    homeGoals: num(r.home_goals),
    awayGoals: num(r.away_goals),
    homePens: num(r.home_pens),
    awayPens: num(r.away_pens),
    competitionName: r.competition_name as string,
  }));
}

/** El clásico catalogado entre dos equipos, si existe. */
export async function rivalryBetween(db: Db, a: string, b: string): Promise<Rivalry | null> {
  return (await listRivalries(db)).find((r) => (r.teamA === a && r.teamB === b) || (r.teamA === b && r.teamB === a)) ?? null;
}
