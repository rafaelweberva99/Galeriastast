import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { Db } from "../db/client.ts";
import type { AttendanceMode } from "../domain/types.ts";

export interface User {
  id: number;
  username: string;
  email: string;
  clubId: string;
  isPublic: boolean;
  createdAt: string;
}

type Row = Record<string, unknown>;

function toUser(r: Row): User {
  return {
    id: Number(r.id),
    username: r.username as string,
    email: r.email as string,
    clubId: r.club_id as string,
    isPublic: Number(r.is_public) === 1,
    createdAt: r.created_at as string,
  };
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, saltHex, hashHex] = stored.split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(password, Buffer.from(saltHex, "hex"), expected.length);
  return timingSafeEqual(expected, actual);
}

export class UserExistsError extends Error {}

export function createUser(db: Db, input: { username: string; email: string; password: string; clubId: string }): User {
  const taken = db
    .prepare("SELECT 1 FROM users WHERE username = ? OR email = ?")
    .get(input.username, input.email);
  if (taken) throw new UserExistsError("El usuario o el correo ya están registrados.");
  const r = db
    .prepare("INSERT INTO users (username, email, password_hash, club_id) VALUES (?, ?, ?, ?) RETURNING *")
    .get(input.username, input.email, hashPassword(input.password), input.clubId) as Row;
  return toUser(r);
}

export function authenticate(db: Db, login: string, password: string): User | null {
  const r = db.prepare("SELECT * FROM users WHERE username = ? OR email = ?").get(login, login) as Row | undefined;
  if (!r || !verifyPassword(password, r.password_hash as string)) return null;
  return toUser(r);
}

export function getUserByUsername(db: Db, username: string): User | null {
  const r = db.prepare("SELECT * FROM users WHERE username = ?").get(username) as Row | undefined;
  return r ? toUser(r) : null;
}

export function updateProfile(db: Db, userId: number, input: { clubId: string; isPublic: boolean }): void {
  db.prepare("UPDATE users SET club_id = ?, is_public = ? WHERE id = ?").run(
    input.clubId,
    input.isPublic ? 1 : 0,
    userId,
  );
}

// --- Sesiones -------------------------------------------------------------

const SESSION_DAYS = 30;

export function createSession(db: Db, userId: number): { token: string; expiresAt: Date } {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  db.prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)").run(
    token,
    userId,
    expiresAt.toISOString(),
  );
  return { token, expiresAt };
}

export function userForSession(db: Db, token: string): User | null {
  const r = db
    .prepare(
      `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token = ? AND s.expires_at > ?`,
    )
    .get(token, new Date().toISOString()) as Row | undefined;
  return r ? toUser(r) : null;
}

export function deleteSession(db: Db, token: string): void {
  db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
}

// --- Asistencias ----------------------------------------------------------

export class AttendanceError extends Error {}

/** Marca (o actualiza el modo de) un partido al que el hincha fue. Solo partidos de su club. */
export function setAttendance(db: Db, user: User, matchId: string, mode: AttendanceMode): void {
  const m = db
    .prepare("SELECT home_team_id, away_team_id, date FROM matches WHERE id = ?")
    .get(matchId) as Row | undefined;
  if (!m) throw new AttendanceError("Partido no encontrado.");
  if (m.home_team_id !== user.clubId && m.away_team_id !== user.clubId)
    throw new AttendanceError("Solo puedes marcar partidos de tu club.");
  if ((m.date as string) > new Date().toISOString().slice(0, 10))
    throw new AttendanceError("No puedes marcar un partido que aún no se juega.");
  db.prepare(
    `INSERT INTO attendances (user_id, match_id, mode) VALUES (?, ?, ?)
     ON CONFLICT(user_id, match_id) DO UPDATE SET mode = excluded.mode`,
  ).run(user.id, matchId, mode);
}

export function removeAttendance(db: Db, userId: number, matchId: string): void {
  db.prepare("DELETE FROM attendances WHERE user_id = ? AND match_id = ?").run(userId, matchId);
}

export function attendanceModes(db: Db, userId: number): Map<string, AttendanceMode> {
  const rows = db.prepare("SELECT match_id, mode FROM attendances WHERE user_id = ?").all(userId) as Row[];
  return new Map(rows.map((r) => [r.match_id as string, r.mode as AttendanceMode]));
}
