import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { Db, Row } from "../db/client.ts";
import type { AttendanceMode } from "../domain/types.ts";

export interface User {
  id: number;
  username: string;
  email: string;
  clubId: string;
  isPublic: boolean;
  createdAt: string;
}

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

export async function createUser(
  db: Db,
  input: { username: string; email: string; password: string; clubId: string; isPublic?: boolean },
): Promise<User> {
  const taken = await db.get(
    "SELECT 1 AS taken FROM users WHERE lower(username) = lower(?) OR lower(email) = lower(?)",
    input.username,
    input.email,
  );
  if (taken) throw new UserExistsError("El usuario o el correo ya están registrados.");
  const r = await db.get(
    "INSERT INTO users (username, email, password_hash, club_id, is_public) VALUES (?, ?, ?, ?, ?) RETURNING *",
    input.username,
    input.email,
    hashPassword(input.password),
    input.clubId,
    // Privacidad por defecto: el carnet es privado salvo que el hincha elija mostrarlo.
    input.isPublic ? 1 : 0,
  );
  return toUser(r!);
}

export async function authenticate(db: Db, login: string, password: string): Promise<User | null> {
  const r = await db.get("SELECT * FROM users WHERE lower(username) = lower(?) OR lower(email) = lower(?)", login, login);
  if (!r || !verifyPassword(password, r.password_hash as string)) return null;
  return toUser(r);
}

export async function getUserByUsername(db: Db, username: string): Promise<User | null> {
  const r = await db.get("SELECT * FROM users WHERE lower(username) = lower(?)", username);
  return r ? toUser(r) : null;
}

/** Cambia el club. La preferencia de perfil público se cambia con setPublicProfile (queda registrada). */
export async function updateProfile(db: Db, userId: number, input: { clubId: string }): Promise<void> {
  await db.run("UPDATE users SET club_id = ? WHERE id = ?", input.clubId, userId);
}

// --- Sesiones -------------------------------------------------------------

const SESSION_DAYS = 30;

export async function createSession(db: Db, userId: number): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db.run("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)", token, userId, expiresAt.toISOString());
  return { token, expiresAt };
}

export async function userForSession(db: Db, token: string): Promise<User | null> {
  const r = await db.get(
    `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token = ? AND s.expires_at > ?`,
    token,
    new Date().toISOString(),
  );
  return r ? toUser(r) : null;
}

export async function deleteSession(db: Db, token: string): Promise<void> {
  await db.run("DELETE FROM sessions WHERE token = ?", token);
}

/** Cierra todas las sesiones del hincha (en todos sus dispositivos). Devuelve cuántas cerró. */
export async function deleteUserSessions(db: Db, userId: number): Promise<number> {
  return db.run("DELETE FROM sessions WHERE user_id = ?", userId);
}

// --- Asistencias ----------------------------------------------------------

export class AttendanceError extends Error {}

/** Marca (o actualiza el modo de) un partido al que el hincha fue. Solo partidos de su club. */
export async function setAttendance(db: Db, user: User, matchId: string, mode: AttendanceMode): Promise<void> {
  const m = await db.get("SELECT home_team_id, away_team_id, date FROM matches WHERE id = ?", matchId);
  if (!m) throw new AttendanceError("Partido no encontrado.");
  if (m.home_team_id !== user.clubId && m.away_team_id !== user.clubId)
    throw new AttendanceError("Solo puedes marcar partidos de tu club.");
  if ((m.date as string) > new Date().toISOString().slice(0, 10))
    throw new AttendanceError("No puedes marcar un partido que aún no se juega.");
  await db.run(
    `INSERT INTO attendances (user_id, match_id, mode) VALUES (?, ?, ?)
     ON CONFLICT (user_id, match_id) DO UPDATE SET mode = excluded.mode`,
    user.id,
    matchId,
    mode,
  );
}

export async function removeAttendance(db: Db, userId: number, matchId: string): Promise<void> {
  await db.run("DELETE FROM attendances WHERE user_id = ? AND match_id = ?", userId, matchId);
}

export async function attendanceModes(db: Db, userId: number): Promise<Map<string, AttendanceMode>> {
  const rows = await db.all("SELECT match_id, mode FROM attendances WHERE user_id = ?", userId);
  return new Map(rows.map((r) => [r.match_id as string, r.mode as AttendanceMode]));
}
