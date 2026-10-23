import type { Db } from "../db/client.ts";
import type { Rivalry } from "../domain/types.ts";

export interface Team {
  id: string;
  name: string;
  shortName: string;
  city: string | null;
  colorPrimary: string;
  colorSecondary: string;
}

type Row = Record<string, unknown>;

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
export function listClubs(db: Db): (Team & { matches: number; fans: number })[] {
  const rows = db
    .prepare(
      `SELECT t.*,
         (SELECT COUNT(*) FROM matches m WHERE m.home_team_id = t.id OR m.away_team_id = t.id) AS matches,
         (SELECT COUNT(*) FROM users u WHERE u.club_id = t.id) AS fans
       FROM teams t
       WHERE t.is_chilean = 1 AND EXISTS (
         SELECT 1 FROM matches m WHERE m.competition_id = 'primera-division'
           AND (m.home_team_id = t.id OR m.away_team_id = t.id))
       ORDER BY t.name`,
    )
    .all() as Row[];
  return rows.map((r) => ({ ...toTeam(r), matches: Number(r.matches), fans: Number(r.fans) }));
}

export function getTeam(db: Db, id: string): Team | null {
  const r = db.prepare("SELECT * FROM teams WHERE id = ?").get(id) as Row | undefined;
  return r ? toTeam(r) : null;
}

export function listRivalries(db: Db): Rivalry[] {
  return (db.prepare("SELECT id, name, team_a, team_b FROM rivalries").all() as Row[]).map((r) => ({
    id: r.id as string,
    name: r.name as string,
    teamA: r.team_a as string,
    teamB: r.team_b as string,
  }));
}
