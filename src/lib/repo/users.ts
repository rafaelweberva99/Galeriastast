import { createHash, randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";
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

// --- Contraseñas ------------------------------------------------------------
// scrypt con parámetros de OWASP (N=2^14, r=8, p=5: 16 MiB, ~0,2 s). El hash guarda sus parámetros
// ("scrypt$N,r,p$sal$hash"); los hashes antiguos ("scrypt$sal$hash") usan N=2^14, r=8, p=1 y se
// actualizan solos en el siguiente ingreso correcto (needsRehash).

interface ScryptParams {
  N: number;
  r: number;
  p: number;
}
const CURRENT: ScryptParams = { N: 2 ** 14, r: 8, p: 5 };
const LEGACY: ScryptParams = { N: 2 ** 14, r: 8, p: 1 };
/** Límite de largo: scrypt procesa la contraseña completa; nadie necesita más que esto. */
export const MAX_PASSWORD_LENGTH = 256;

function scryptAsync(password: string, salt: Buffer, len: number, { N, r, p }: ScryptParams): Promise<Buffer> {
  const opts: ScryptOptions = { N, r, p, maxmem: 256 * N * r + 1024 * 1024 };
  return new Promise((resolve, reject) => scrypt(password, salt, len, opts, (e, key) => (e ? reject(e) : resolve(key))));
}

function parseHash(stored: string): { params: ScryptParams; salt: Buffer; hash: Buffer } | null {
  const parts = stored.split("$");
  if (parts[0] !== "scrypt") return null;
  let params = LEGACY;
  if (parts.length === 4) {
    const [N, r, p] = parts[1].split(",").map(Number);
    // Parámetros acotados: un hash manipulado no puede pedir memoria o CPU sin límite.
    if (![N, r, p].every(Number.isInteger) || N < 2 ** 10 || N > 2 ** 17 || r < 1 || r > 16 || p < 1 || p > 16) return null;
    params = { N, r, p };
  } else if (parts.length !== 3) return null;
  const [saltHex, hashHex] = parts.slice(-2);
  if (!saltHex || !hashHex) return null;
  return { params, salt: Buffer.from(saltHex, "hex"), hash: Buffer.from(hashHex, "hex") };
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, 64, CURRENT);
  return `scrypt$${CURRENT.N},${CURRENT.r},${CURRENT.p}$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parsed = parseHash(stored);
  if (!parsed || !parsed.hash.length || password.length > MAX_PASSWORD_LENGTH) return false;
  const actual = await scryptAsync(password, parsed.salt, parsed.hash.length, parsed.params);
  return timingSafeEqual(parsed.hash, actual);
}

/** Si el hash usa parámetros más débiles que los vigentes (se recalcula al ingresar). */
export function needsRehash(stored: string): boolean {
  const parsed = parseHash(stored);
  return !parsed || parsed.params.N < CURRENT.N || parsed.params.r < CURRENT.r || parsed.params.p < CURRENT.p;
}

/** Hash de relleno: cuando el usuario no existe se verifica igual, para que el tiempo de respuesta no lo delate. */
let dummyHash: Promise<string> | null = null;

export class UserExistsError extends Error {}

export async function createUser(
  db: Db,
  input: { username: string; email: string; password: string; clubId: string; isPublic?: boolean; passwordHash?: string },
): Promise<User> {
  const taken = await db.get(
    "SELECT 1 AS taken FROM users WHERE lower(username) = lower(?) OR lower(email) = lower(?)",
    input.username,
    input.email,
  );
  if (taken) throw new UserExistsError("El usuario o el correo ya están registrados.");
  let r: Row | undefined;
  try {
    r = await db.get(
      "INSERT INTO users (username, email, password_hash, club_id, is_public) VALUES (?, ?, ?, ?, ?) RETURNING *",
      input.username,
      input.email,
      input.passwordHash ?? (await hashPassword(input.password)),
      input.clubId,
      // Privacidad por defecto: el carnet es privado salvo que el hincha elija mostrarlo.
      input.isPublic ? 1 : 0,
    );
  } catch (e) {
    // Dos registros simultáneos con el mismo nombre: el índice único decide quién gana.
    if (/unique|duplicate/i.test(String((e as Error).message))) {
      throw new UserExistsError("El usuario o el correo ya están registrados.");
    }
    throw e;
  }
  return toUser(r!);
}

export async function authenticate(db: Db, login: string, password: string): Promise<User | null> {
  const r = await db.get("SELECT * FROM users WHERE lower(username) = lower(?) OR lower(email) = lower(?)", login, login);
  if (!r) {
    dummyHash ??= hashPassword("galuchastats-relleno");
    await verifyPassword(password, await dummyHash);
    return null;
  }
  const stored = r.password_hash as string;
  if (!(await verifyPassword(password, stored))) return null;
  if (needsRehash(stored)) await db.run("UPDATE users SET password_hash = ? WHERE id = ?", await hashPassword(password), Number(r.id));
  return toUser(r);
}

export async function getUserByUsername(db: Db, username: string): Promise<User | null> {
  const r = await db.get("SELECT * FROM users WHERE lower(username) = lower(?)", username);
  return r ? toUser(r) : null;
}

/** Cambia el club. La preferencia de perfil público se cambia con setPublicProfile (queda registrada). */
export async function updateProfile(db: Db, userId: number, input: { clubId: string; username?: string }): Promise<void> {
  const username = input.username?.trim();
  if (username) {
    const taken = await db.get("SELECT 1 AS taken FROM users WHERE lower(username) = lower(?) AND id <> ?", username, userId);
    if (taken) throw new UserExistsError("Ese nombre de usuario ya está en uso.");
  }
  try {
    if (username) await db.run("UPDATE users SET club_id = ?, username = ? WHERE id = ?", input.clubId, username, userId);
    else await db.run("UPDATE users SET club_id = ? WHERE id = ?", input.clubId, userId);
  } catch (e) {
    // Dos hinchas eligiendo el mismo nombre a la vez: el índice único decide.
    if (/unique|duplicate/i.test(String((e as Error).message))) throw new UserExistsError("Ese nombre de usuario ya está en uso.");
    throw e;
  }
}

// --- Sesiones -------------------------------------------------------------

const SESSION_DAYS = 30;

/**
 * En la base solo se guarda el SHA-256 del token: si alguien llegara a leer la tabla sessions
 * (un respaldo filtrado, por ejemplo), no podría usar esas sesiones.
 */
export const hashToken = (token: string): string => createHash("sha256").update(token).digest("hex");

export async function createSession(db: Db, userId: number): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_DAYS * 86_400_000);
  // De paso se limpian las sesiones vencidas del hincha.
  await db.run("DELETE FROM sessions WHERE user_id = ? AND expires_at <= ?", userId, now.toISOString());
  await db.run("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)", hashToken(token), userId, expiresAt.toISOString());
  return { token, expiresAt };
}

export async function userForSession(db: Db, token: string): Promise<User | null> {
  if (token.length > 100) return null;
  const r = await db.get(
    `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token = ? AND s.expires_at > ?`,
    hashToken(token),
    new Date().toISOString(),
  );
  return r ? toUser(r) : null;
}

export async function deleteSession(db: Db, token: string): Promise<void> {
  await db.run("DELETE FROM sessions WHERE token = ?", hashToken(token));
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
