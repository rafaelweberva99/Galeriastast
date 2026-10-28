import type { Db, Row } from "../db/client.ts";
import type { Goal } from "../domain/types.ts";

function toGoal(r: Row): Goal {
  return {
    matchId: r.match_id as string,
    teamId: r.team_id as string,
    player: r.player as string,
    minute: r.minute === null || r.minute === undefined ? null : Number(r.minute),
    ownGoal: Number(r.own_goal) === 1,
    penalty: Number(r.penalty) === 1,
  };
}

function group(rows: Row[]): Map<string, Goal[]> {
  const out = new Map<string, Goal[]>();
  for (const r of rows) {
    const g = toGoal(r);
    out.set(g.matchId, [...(out.get(g.matchId) ?? []), g]);
  }
  return out;
}

const COLS = "match_id, team_id, player, minute, own_goal, penalty";

/** Goles de los partidos que el hincha marcó. */
export async function goalsForAttended(db: Db, userId: number): Promise<Map<string, Goal[]>> {
  return group(
    await db.all(
      `SELECT g.${COLS.split(", ").join(", g.")} FROM goals g JOIN attendances a ON a.match_id = g.match_id
       WHERE a.user_id = ? ORDER BY g.match_id, g.minute`,
      userId,
    ),
  );
}

/** Goles de todos los partidos de un club (historial del club). */
export async function goalsForClub(db: Db, clubId: string): Promise<Map<string, Goal[]>> {
  return group(
    await db.all(
      `SELECT g.${COLS.split(", ").join(", g.")} FROM goals g JOIN matches m ON m.id = g.match_id
       WHERE m.home_team_id = ? OR m.away_team_id = ? ORDER BY g.match_id, g.minute`,
      clubId,
      clubId,
    ),
  );
}

/** Goles de una lista de partidos (para mostrar goleadores en listados). */
export async function goalsForMatches(db: Db, matchIds: string[]): Promise<Map<string, Goal[]>> {
  if (!matchIds.length) return new Map();
  const out = new Map<string, Goal[]>();
  for (let i = 0; i < matchIds.length; i += 500) {
    const chunk = matchIds.slice(i, i + 500);
    const rows = await db.all(
      `SELECT ${COLS} FROM goals WHERE match_id IN (${chunk.map(() => "?").join(", ")}) ORDER BY match_id, minute`,
      ...chunk,
    );
    for (const [k, v] of group(rows)) out.set(k, v);
  }
  return out;
}
