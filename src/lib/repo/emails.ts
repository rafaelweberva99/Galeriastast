import type { Db } from "../db/client.ts";

export const REMINDER_KIND = "recordatorio-7d";
/** Solo se recuerda a quien se registró hace entre 7 y 30 días: más viejo ya no es "a medias", es abandono. */
export const REMINDER_AFTER_DAYS = 7;
export const REMINDER_UNTIL_DAYS = 30;

const stamp = (d: Date) => d.toISOString().slice(0, 19).replace("T", " ");

export interface FanToRemind {
  id: number;
  username: string;
  email: string;
  clubId: string;
  clubName: string;
}

/** Hinchas que se registraron hace 7-30 días, no marcaron ningún partido, no recibieron ya el recordatorio y no se dieron de baja. */
export async function fansToRemind(db: Db, now: Date, limit: number): Promise<FanToRemind[]> {
  const day = 86_400_000;
  const rows = await db.all<{ id: number | string; username: string; email: string; club_id: string; club_name: string }>(
    `SELECT u.id, u.username, u.email, u.club_id, t.name AS club_name
       FROM users u JOIN teams t ON t.id = u.club_id
      WHERE u.created_at <= ? AND u.created_at > ?
        AND NOT EXISTS (SELECT 1 FROM attendances a WHERE a.user_id = u.id)
        AND NOT EXISTS (SELECT 1 FROM email_events e WHERE e.user_id = u.id AND e.kind = ?)
        AND NOT EXISTS (SELECT 1 FROM email_optouts o WHERE o.user_id = u.id)
      ORDER BY u.created_at
      LIMIT ?`,
    stamp(new Date(now.getTime() - REMINDER_AFTER_DAYS * day)),
    stamp(new Date(now.getTime() - REMINDER_UNTIL_DAYS * day)),
    REMINDER_KIND,
    limit,
  );
  return rows.map((r) => ({ id: Number(r.id), username: r.username, email: r.email, clubId: r.club_id, clubName: r.club_name }));
}

/** Marca el recordatorio como enviado (idempotente). */
export async function markReminded(db: Db, userId: number): Promise<void> {
  await db.run("INSERT INTO email_events (user_id, kind) VALUES (?, ?) ON CONFLICT (user_id, kind) DO NOTHING", userId, REMINDER_KIND);
}

export async function optOutReminders(db: Db, userId: number): Promise<boolean> {
  const exists = await db.get("SELECT 1 AS x FROM users WHERE id = ?", userId);
  if (!exists) return false;
  await db.run("INSERT INTO email_optouts (user_id) VALUES (?) ON CONFLICT (user_id) DO NOTHING", userId);
  return true;
}

export async function countFans(db: Db): Promise<number> {
  const r = await db.get<{ n: number | string }>("SELECT COUNT(*) AS n FROM users");
  return Number(r?.n ?? 0);
}
