/**
 * Cuenta del hincha y sus datos personales (Ley 19.628, reformada por la Ley 21.719):
 * registro con consentimientos, registro de consentimientos, reaceptación de documentos,
 * preferencia de perfil público, exportación (acceso / portabilidad) y supresión de la cuenta.
 */
import type { Db } from "../db/client.ts";
import {
  AGE_VERSION,
  MIN_AGE,
  LEGAL_DATE,
  PRIVACY_VERSION,
  REQUIRED_DOCS,
  type ConsentKind,
  type RequiredDoc,
} from "../legal.ts";
import { createUser, verifyPassword, type User } from "./users.ts";

export class ConsentRequiredError extends Error {}
export class AccountError extends Error {}

export interface ConsentRecord {
  kind: ConsentKind;
  version: string;
  granted: boolean;
  createdAt: string;
}

// --- Consentimientos --------------------------------------------------------

export async function recordConsent(
  db: Db,
  userId: number,
  kind: ConsentKind,
  version: string,
  granted: boolean,
): Promise<void> {
  await db.run(
    "INSERT INTO consents (user_id, kind, version, granted) VALUES (?, ?, ?, ?)",
    userId,
    kind,
    version,
    granted ? 1 : 0,
  );
}

/** Historial completo de consentimientos del hincha, del más antiguo al más reciente. */
export async function listConsents(db: Db, userId: number): Promise<ConsentRecord[]> {
  const rows = await db.all("SELECT kind, version, granted, created_at FROM consents WHERE user_id = ? ORDER BY id", userId);
  return rows.map((r) => ({
    kind: r.kind as ConsentKind,
    version: r.version as string,
    granted: Number(r.granted) === 1,
    createdAt: r.created_at as string,
  }));
}

export interface LegalStatus {
  /** Documentos cuya versión vigente el hincha aún no acepta. */
  pending: RequiredDoc[];
  /** Si alguna vez declaró tener la edad mínima. */
  ageDeclared: boolean;
  /** Si alguna vez eligió (sí o no) mostrar su carnet en público. */
  publicChoiceMade: boolean;
}

export async function legalStatus(db: Db, userId: number, current: Record<RequiredDoc, string> = REQUIRED_DOCS): Promise<LegalStatus> {
  const latest = new Map<ConsentKind, ConsentRecord>();
  for (const c of await listConsents(db, userId)) latest.set(c.kind, c);
  const pending = (Object.keys(current) as RequiredDoc[]).filter((doc) => {
    const c = latest.get(doc);
    return !c || !c.granted || c.version !== current[doc];
  });
  return {
    pending,
    ageDeclared: (latest.get("age")?.granted ?? false) && latest.get("age")?.version === AGE_VERSION,
    publicChoiceMade: latest.has("public_profile"),
  };
}

export function needsAcceptance(s: LegalStatus): boolean {
  return s.pending.length > 0 || !s.ageDeclared;
}

/** Cambia la preferencia de perfil público y la registra (si cambió o si nunca se había elegido). */
export async function setPublicProfile(db: Db, userId: number, isPublic: boolean): Promise<void> {
  await db.transaction(async (tx) => {
    const prev = await tx.get("SELECT is_public FROM users WHERE id = ?", userId);
    if (!prev) throw new AccountError("Cuenta no encontrada.");
    const chosen = await tx.get("SELECT 1 AS chosen FROM consents WHERE user_id = ? AND kind = 'public_profile'", userId);
    if (chosen && (Number(prev.is_public) === 1) === isPublic) return;
    await tx.run("UPDATE users SET is_public = ? WHERE id = ?", isPublic ? 1 : 0, userId);
    await recordConsent(tx, userId, "public_profile", PRIVACY_VERSION, isPublic);
  });
}

/**
 * Acepta las versiones vigentes de los documentos pendientes (y la declaración de edad si falta).
 * isPublic se registra solo si se entrega (hinchas antiguos que nunca eligieron).
 */
export async function acceptLegal(
  db: Db,
  userId: number,
  input: { acceptTerms: boolean; acceptPrivacy: boolean; isAdult: boolean; isPublic?: boolean },
  current: Record<RequiredDoc, string> = REQUIRED_DOCS,
): Promise<void> {
  // El estado se lee dentro de la transacción: un doble envío no duplica los registros.
  const status = await db.transaction(async (tx) => {
    const st = await legalStatus(tx, userId, current);
    if (st.pending.includes("terms") && !input.acceptTerms)
      throw new ConsentRequiredError("Debes aceptar los Términos y Condiciones para seguir usando tu cuenta.");
    if (st.pending.includes("privacy") && !input.acceptPrivacy)
      throw new ConsentRequiredError("Debes confirmar que leíste la Política de Privacidad para seguir usando tu cuenta.");
    if (!st.ageDeclared && !input.isAdult) throw new ConsentRequiredError(`Debes declarar que tienes ${MIN_AGE} años o más.`);
    for (const doc of st.pending) await recordConsent(tx, userId, doc, current[doc], true);
    if (!st.ageDeclared) await recordConsent(tx, userId, "age", AGE_VERSION, true);
    return st;
  });
  if (input.isPublic !== undefined && !status.publicChoiceMade) await setPublicProfile(db, userId, input.isPublic);
}

// --- Registro ---------------------------------------------------------------

export interface RegisterInput {
  username: string;
  email: string;
  password: string;
  clubId: string;
  acceptTerms: boolean;
  acceptPrivacy: boolean;
  isAdult: boolean;
  /** Opcional y desmarcado por defecto. */
  isPublic?: boolean;
}

/** Crea la cuenta y registra, en la misma transacción, cada consentimiento con su versión. */
export async function registerUser(db: Db, input: RegisterInput): Promise<User> {
  if (!input.acceptTerms) throw new ConsentRequiredError("Debes aceptar los Términos y Condiciones.");
  if (!input.acceptPrivacy) throw new ConsentRequiredError("Debes confirmar que leíste la Política de Privacidad.");
  if (!input.isAdult) throw new ConsentRequiredError(`Debes tener ${MIN_AGE} años o más para crear una cuenta.`);
  const isPublic = input.isPublic === true;
  return db.transaction(async (tx) => {
    const user = await createUser(tx, { ...input, isPublic });
    await recordConsent(tx, user.id, "terms", REQUIRED_DOCS.terms, true);
    await recordConsent(tx, user.id, "privacy", REQUIRED_DOCS.privacy, true);
    await recordConsent(tx, user.id, "age", AGE_VERSION, true);
    await recordConsent(tx, user.id, "public_profile", PRIVACY_VERSION, isPublic);
    return user;
  });
}

// --- Exportación (derecho de acceso y portabilidad) --------------------------

export interface UserDataExport {
  format: "galeriastats-export";
  exportedAt: string;
  /** Versiones vigentes al momento de la descarga; las que aceptaste están en `consents`. */
  currentLegalVersions: { terms: string; privacy: string; date: string };
  profile: { id: number; username: string; email: string; clubId: string; isPublic: boolean; createdAt: string };
  attendances: {
    matchId: string;
    date: string;
    homeTeam: string;
    awayTeam: string;
    homeGoals: number | null;
    awayGoals: number | null;
    mode: string;
    markedAt: string;
  }[];
  consents: ConsentRecord[];
  activeSessions: { expiresAt: string }[];
}

/** Datos personales del hincha en formato estructurado. Nunca incluye el hash de la contraseña ni los tokens. */
export async function exportUserData(db: Db, userId: number): Promise<UserDataExport> {
  const u = await db.get("SELECT id, username, email, club_id, is_public, created_at FROM users WHERE id = ?", userId);
  if (!u) throw new AccountError("Cuenta no encontrada.");
  const att = await db.all(
    `SELECT a.match_id, m.date, th.name AS home_team, ta.name AS away_team, m.home_goals, m.away_goals,
            a.mode, a.created_at
       FROM attendances a
       JOIN matches m ON m.id = a.match_id
       JOIN teams th ON th.id = m.home_team_id
       JOIN teams ta ON ta.id = m.away_team_id
      WHERE a.user_id = ?
      ORDER BY m.date, a.match_id`,
    userId,
  );
  const sessions = await db.all(
    "SELECT expires_at FROM sessions WHERE user_id = ? AND expires_at > ? ORDER BY expires_at",
    userId,
    new Date().toISOString(),
  );
  const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));
  return {
    format: "galeriastats-export",
    exportedAt: new Date().toISOString(),
    currentLegalVersions: { terms: REQUIRED_DOCS.terms, privacy: REQUIRED_DOCS.privacy, date: LEGAL_DATE },
    profile: {
      id: Number(u.id),
      username: u.username as string,
      email: u.email as string,
      clubId: u.club_id as string,
      isPublic: Number(u.is_public) === 1,
      createdAt: u.created_at as string,
    },
    attendances: att.map((r) => ({
      matchId: r.match_id as string,
      date: r.date as string,
      homeTeam: r.home_team as string,
      awayTeam: r.away_team as string,
      homeGoals: num(r.home_goals),
      awayGoals: num(r.away_goals),
      mode: r.mode as string,
      markedAt: r.created_at as string,
    })),
    consents: await listConsents(db, userId),
    activeSessions: sessions.map((s) => ({ expiresAt: s.expires_at as string })),
  };
}

// --- Supresión (eliminar la cuenta) ----------------------------------------

/**
 * Elimina la cuenta tras confirmar el nombre de usuario y la contraseña.
 * Las sesiones, asistencias y consentimientos se borran por ON DELETE CASCADE.
 */
export async function deleteAccount(db: Db, userId: number, confirm: { username: string; password: string }): Promise<void> {
  const r = await db.get("SELECT username, password_hash FROM users WHERE id = ?", userId);
  if (!r) throw new AccountError("Cuenta no encontrada.");
  if (confirm.username.trim().toLowerCase() !== String(r.username).toLowerCase())
    throw new AccountError("El nombre de usuario no coincide.");
  if (!verifyPassword(confirm.password, r.password_hash as string)) throw new AccountError("La contraseña no es correcta.");
  await db.run("DELETE FROM users WHERE id = ?", userId);
}
