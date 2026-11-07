import type { Db } from "../db/client.ts";
import { effectiveness, MIN_MATCHES_FOR_VERDICT } from "../domain/stats.ts";

export interface FanRanking {
  username: string;
  clubId: string;
  attended: number;
  won: number;
  drawn: number;
  lost: number;
  effectiveness: number | null;
}

/**
 * Hinchas públicos de un club con su récord en los partidos a los que fueron.
 * El cálculo de G/E/P se hace en SQL para que el ranking escale con muchos hinchas.
 */
export async function fansOfClub(db: Db, clubId: string, limit = 100): Promise<FanRanking[]> {
  // LEFT JOIN: un hincha público sin partidos marcados también cuenta (así el ranking muestra a todos los que cuenta la portada).
  const rows = await db.all(
    `SELECT u.username, u.club_id,
         COUNT(m.id) AS attended,
         SUM(CASE WHEN m.home_goals IS NOT NULL AND
               ((m.home_team_id = u.club_id AND m.home_goals > m.away_goals) OR
                (m.away_team_id = u.club_id AND m.away_goals > m.home_goals)) THEN 1 ELSE 0 END) AS won,
         SUM(CASE WHEN m.home_goals IS NOT NULL AND m.home_goals = m.away_goals THEN 1 ELSE 0 END) AS drawn,
         SUM(CASE WHEN m.home_goals IS NOT NULL AND
               ((m.home_team_id = u.club_id AND m.home_goals < m.away_goals) OR
                (m.away_team_id = u.club_id AND m.away_goals < m.home_goals)) THEN 1 ELSE 0 END) AS lost
       FROM users u
       LEFT JOIN attendances a ON a.user_id = u.id
       LEFT JOIN matches m ON m.id = a.match_id AND (m.home_team_id = u.club_id OR m.away_team_id = u.club_id) AND m.date <= ?
       WHERE u.club_id = ? AND u.is_public = 1
       GROUP BY u.id
       ORDER BY attended DESC, u.username
       LIMIT ?`,
    new Date().toISOString().slice(0, 10), // los partidos marcados que aún no se juegan no cuentan
    clubId,
    limit,
  );
  return rows.map((r) => {
    const won = Number(r.won);
    const drawn = Number(r.drawn);
    const lost = Number(r.lost);
    const played = won + drawn + lost;
    return {
      username: r.username as string,
      clubId: r.club_id as string,
      attended: Number(r.attended),
      won,
      drawn,
      lost,
      effectiveness: effectiveness({ played, won, drawn, lost, goalsFor: 0, goalsAgainst: 0 }),
    };
  });
}

/** Ranking de cábalas: mayor efectividad entre hinchas con un mínimo de partidos. */
export function topCabalas(fans: FanRanking[], minMatches = MIN_MATCHES_FOR_VERDICT): FanRanking[] {
  return fans
    .filter((f) => f.won + f.drawn + f.lost >= minMatches)
    .sort((a, b) => (b.effectiveness ?? 0) - (a.effectiveness ?? 0));
}

/** Clubes ordenados por cantidad de hinchas registrados. */
export async function clubsByFans(db: Db): Promise<{ clubId: string; name: string; fans: number; attendances: number }[]> {
  return (
    await db.all(
      `SELECT t.id AS club_id, t.name, COUNT(DISTINCT u.id) AS fans, COUNT(a.match_id) AS attendances
         FROM teams t JOIN users u ON u.club_id = t.id AND u.is_public = 1
         LEFT JOIN attendances a ON a.user_id = u.id
           AND a.match_id IN (SELECT id FROM matches WHERE date <= ?)
         GROUP BY t.id ORDER BY fans DESC, attendances DESC`,
      new Date().toISOString().slice(0, 10),
    )
  ).map((r) => ({
    clubId: r.club_id as string,
    name: r.name as string,
    fans: Number(r.fans),
    attendances: Number(r.attendances),
  }));
}
