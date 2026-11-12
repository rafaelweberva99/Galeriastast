import type { Db } from "../db/client.ts";

export interface AdminSummary {
  users: number;
  publicUsers: number;
  attendances: number;
  infiltrated: number;
  usersLast7Days: number;
  byClub: { clubId: string; name: string; users: number; attendances: number }[];
  pendingLegal: number;
}

export interface RecentFan {
  username: string;
  clubName: string;
  createdAt: string;
  marked: number;
  /** Segundo club (null si no tiene). */
  secondClubName: string | null;
  /** Cuándo marcó su último partido (null si nunca marcó). */
  lastMarkedAt: string | null;
}

/** Últimos hinchas registrados: usuario y club (ya públicos en su Galería), fecha y partidos marcados. Sin correo. */
export async function recentFans(db: Db, limit = 100): Promise<RecentFan[]> {
  const rows = await db.all<{
    username: string;
    club_name: string;
    created_at: string;
    marked: number | string;
    second_name: string | null;
    last_marked: string | null;
  }>(
    `SELECT u.username, t.name AS club_name, u.created_at,
            (SELECT COUNT(*) FROM attendances a WHERE a.user_id = u.id) AS marked,
            (SELECT MAX(a.created_at) FROM attendances a WHERE a.user_id = u.id) AS last_marked,
            t2.name AS second_name
       FROM users u JOIN teams t ON t.id = u.club_id
       LEFT JOIN user_second_club sc ON sc.user_id = u.id
       LEFT JOIN teams t2 ON t2.id = sc.club_id
      ORDER BY u.created_at DESC, u.id DESC LIMIT ?`,
    limit,
  );
  return rows.map((r) => ({
    username: r.username,
    clubName: r.club_name,
    createdAt: r.created_at,
    marked: Number(r.marked),
    secondClubName: r.second_name,
    lastMarkedAt: r.last_marked,
  }));
}

/** Cifras agregadas para el panel de administración (sin datos personales de los hinchas). */
export async function adminSummary(db: Db, current: { terms: string; privacy: string }): Promise<AdminSummary> {
  const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const totals = (await db.get(
    `SELECT (SELECT COUNT(*) FROM users) AS users,
            (SELECT COUNT(*) FROM users WHERE is_public = 1) AS public_users,
            (SELECT COUNT(*) FROM attendances) AS attendances,
            (SELECT COUNT(*) FROM attendances WHERE mode = 'infiltrado') AS infiltrated,
            (SELECT COUNT(*) FROM users WHERE created_at >= ?) AS recent`,
    since,
  ))!;
  const byClub = await db.all(
    `SELECT t.id AS club_id, t.name, COUNT(DISTINCT u.id) AS users, COUNT(a.match_id) AS attendances
       FROM users u JOIN teams t ON t.id = u.club_id
       LEFT JOIN attendances a ON a.user_id = u.id
      GROUP BY t.id, t.name ORDER BY users DESC, attendances DESC`,
  );
  // Hinchas sin la versión vigente de los Términos o de la Política de Privacidad aceptada.
  const pending = (await db.get(
    `SELECT COUNT(*) AS n FROM users u WHERE
       NOT EXISTS (SELECT 1 FROM consents c WHERE c.user_id = u.id AND c.kind = 'terms' AND c.version = ? AND c.granted = 1)
       OR NOT EXISTS (SELECT 1 FROM consents c WHERE c.user_id = u.id AND c.kind = 'privacy' AND c.version = ? AND c.granted = 1)`,
    current.terms,
    current.privacy,
  ))!;
  return {
    users: Number(totals.users),
    publicUsers: Number(totals.public_users),
    attendances: Number(totals.attendances),
    infiltrated: Number(totals.infiltrated),
    usersLast7Days: Number(totals.recent),
    byClub: byClub.map((r) => ({
      clubId: r.club_id as string,
      name: r.name as string,
      users: Number(r.users),
      attendances: Number(r.attendances),
    })),
    pendingLegal: Number(pending.n),
  };
}
