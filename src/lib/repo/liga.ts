import type { Db } from "../db/client.ts";

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
