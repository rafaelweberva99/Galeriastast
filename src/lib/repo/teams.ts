import type { Db, Row } from "../db/client.ts";
import type { Rivalry } from "../domain/types.ts";

export interface Team {
  id: string;
  name: string;
  shortName: string;
  city: string | null;
  colorPrimary: string;
  colorSecondary: string;
}

function toTeam(r: Row): Team {
  return {
    id: r.id as string,
    name: r.name as string,
    shortName: r.short_name as string,
    city: (r.city as string | null) ?? null,
    colorPrimary: r.color_primary as string,
    colorSecondary: r.color_secondary as string,
  };
}

/**
 * Clubes chilenos profesionales (con al menos un partido en Primera División),
 * ordenados alfabéticamente. Los clubes amateur que solo aparecen en Copa Chile quedan fuera.
 */
export async function listClubs(db: Db): Promise<(Team & { matches: number; fans: number; lastSeason: number })[]> {
  const rows = await db.all(
    `SELECT t.*,
         (SELECT COUNT(*) FROM matches m WHERE m.home_team_id = t.id OR m.away_team_id = t.id) AS matches,
         (SELECT COUNT(*) FROM users u WHERE u.club_id = t.id) AS fans,
         (SELECT MAX(m.season) FROM matches m WHERE m.competition_id = 'primera-division'
            AND (m.home_team_id = t.id OR m.away_team_id = t.id)) AS last_season
       FROM teams t
       WHERE t.is_chilean = 1 AND EXISTS (
         SELECT 1 FROM matches m WHERE m.competition_id = 'primera-division'
           AND (m.home_team_id = t.id OR m.away_team_id = t.id))
       ORDER BY t.name`,
  );
  return rows.map((r) => ({
    ...toTeam(r),
    matches: Number(r.matches),
    fans: Number(r.fans),
    lastSeason: Number(r.last_season),
  }));
}

export async function getTeam(db: Db, id: string): Promise<Team | null> {
  const r = await db.get("SELECT * FROM teams WHERE id = ?", id);
  return r ? toTeam(r) : null;
}

export async function listRivalries(db: Db): Promise<Rivalry[]> {
  return (await db.all("SELECT id, name, team_a, team_b FROM rivalries")).map((r) => ({
    id: r.id as string,
    name: r.name as string,
    teamA: r.team_a as string,
    teamB: r.team_b as string,
  }));
}
