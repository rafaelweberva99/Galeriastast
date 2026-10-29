/**
 * Freno a la fuerza bruta (ingreso y registro), guardado en la base para que valga entre todas las
 * instancias serverless. Cada clave (correo/usuario o IP) acumula fallos; al llegar al límite queda
 * bloqueada un tiempo que se duplica con cada fallo extra, hasta un máximo. Un periodo sin fallos
 * (window) borra la cuenta.
 */
import { createHash } from "node:crypto";
import type { Db } from "../db/client.ts";

export interface ThrottleRule {
  /** Fallos permitidos antes del primer bloqueo. */
  limit: number;
  /** Duración del primer bloqueo; cada fallo siguiente la duplica. */
  baseLockMs: number;
  maxLockMs: number;
  /** Sin fallos durante este tiempo, la cuenta vuelve a cero. */
  windowMs: number;
}

const MIN = 60_000;
export const RULES = {
  /** Por cuenta (lo que se escribe en "usuario o correo"): bloqueo corto para no dejar a nadie fuera por mucho rato. */
  login: { limit: 5, baseLockMs: 1 * MIN, maxLockMs: 15 * MIN, windowMs: 60 * MIN },
  /** Por IP: holgado, porque muchas personas pueden compartir IP (wifi del estadio, universidad, 4G). */
  ip: { limit: 30, baseLockMs: 5 * MIN, maxLockMs: 60 * MIN, windowMs: 60 * MIN },
  /** Cuentas creadas (o intentos con usuario/correo repetido) por IP. */
  register: { limit: 10, baseLockMs: 30 * MIN, maxLockMs: 24 * 60 * MIN, windowMs: 60 * MIN },
} satisfies Record<string, ThrottleRule>;

export type ThrottleKind = keyof typeof RULES;

/** La clave no guarda el correo ni la IP en claro (minimización de datos personales). */
export function throttleKey(kind: ThrottleKind, value: string): string {
  return `${kind}:${createHash("sha256").update(value.trim().toLowerCase()).digest("hex").slice(0, 40)}`;
}

const ruleOf = (key: string): ThrottleRule => RULES[key.slice(0, key.indexOf(":")) as ThrottleKind];

/** Hasta cuándo está bloqueada alguna de las claves (null si ninguna lo está). */
export async function lockedUntil(db: Db, keys: string[], now = new Date()): Promise<Date | null> {
  let until: Date | null = null;
  for (const key of keys) {
    const r = await db.get("SELECT locked_until FROM login_attempts WHERE key = ? AND locked_until > ?", key, now.toISOString());
    const d = r ? new Date(r.locked_until as string) : null;
    if (d && (!until || d > until)) until = d;
  }
  return until;
}

/** Anota un fallo (atómico: dos peticiones simultáneas suman dos) y bloquea la clave si corresponde. */
export async function recordFailure(db: Db, key: string, now = new Date()): Promise<{ failures: number; lockedUntil: Date | null }> {
  const rule = ruleOf(key);
  const iso = now.toISOString();
  const stale = new Date(now.getTime() - rule.windowMs).toISOString();
  const r = await db.get(
    `INSERT INTO login_attempts (key, failures, last_failure) VALUES (?, 1, ?)
     ON CONFLICT (key) DO UPDATE SET
       failures = CASE WHEN login_attempts.last_failure < ? THEN 1 ELSE login_attempts.failures + 1 END,
       last_failure = excluded.last_failure
     RETURNING failures`,
    key,
    iso,
    stale,
  );
  const failures = Number(r?.failures ?? 1);
  let until: Date | null = null;
  if (failures >= rule.limit) {
    const ms = Math.min(rule.baseLockMs * 2 ** Math.min(failures - rule.limit, 20), rule.maxLockMs);
    until = new Date(now.getTime() + ms);
    await db.run("UPDATE login_attempts SET locked_until = ? WHERE key = ?", until.toISOString(), key);
  }
  // Limpieza de paso: claves sin fallos hace más de un día.
  await db.run("DELETE FROM login_attempts WHERE last_failure < ?", new Date(now.getTime() - 86_400_000).toISOString());
  return { failures, lockedUntil: until };
}

/** Ingreso correcto: se olvidan los fallos de esa cuenta. */
export async function clearFailures(db: Db, key: string): Promise<void> {
  await db.run("DELETE FROM login_attempts WHERE key = ?", key);
}

/** Mensaje genérico: no revela si la cuenta existe. */
export function lockedMessage(until: Date, now = new Date()): string {
  const min = Math.max(1, Math.ceil((until.getTime() - now.getTime()) / MIN));
  return `Demasiados intentos. Por seguridad, espera ${min === 1 ? "1 minuto" : `${min} minutos`} y vuelve a intentarlo.`;
}
