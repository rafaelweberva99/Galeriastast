import { afterEach, describe, expect, it } from "vitest";
import type { Db } from "../src/lib/db/client.ts";
import { AGE_VERSION, PRIVACY_VERSION, REQUIRED_DOCS, TERMS_VERSION } from "../src/lib/legal.ts";
import {
  acceptLegal,
  AccountError,
  ConsentRequiredError,
  deleteAccount,
  exportUserData,
  legalStatus,
  listConsents,
  needsAcceptance,
  registerUser,
  setPublicProfile,
  type RegisterInput,
} from "../src/lib/repo/account.ts";
import { clubsByFans, fansOfClub } from "../src/lib/repo/rankings.ts";
import { authenticate, createSession, createUser, deleteUserSessions, getUserByUsername, setAttendance, userForSession } from "../src/lib/repo/users.ts";
import { ENGINES } from "./engines.ts";

async function seed(open: () => Promise<Db>): Promise<Db> {
  const db = await open();
  await db.exec(`
    INSERT INTO competitions VALUES ('primera-division', 'Primera División', 'liga', 1);
    INSERT INTO teams (id, name, short_name) VALUES ('colo-colo', 'Colo-Colo', 'Colo-Colo'), ('everton', 'Everton', 'Everton');
    INSERT INTO matches (id, date, season, competition_id, home_team_id, away_team_id, home_goals, away_goals, source) VALUES
      ('a', '2024-03-01', 2024, 'primera-division', 'colo-colo', 'everton', 2, 0, 't'),
      ('b', '2024-04-01', 2024, 'primera-division', 'everton', 'colo-colo', 1, 1, 't');
  `);
  return db;
}

const base: RegisterInput = {
  username: "garra",
  email: "g@x.cl",
  password: "secreto123",
  clubId: "colo-colo",
  acceptTerms: true,
  acceptPrivacy: true,
  isAdult: true,
};

async function count(db: Db, table: string, userId: number): Promise<number> {
  const r = await db.get<{ n: unknown }>(`SELECT COUNT(*) AS n FROM ${table} WHERE user_id = ?`, userId);
  return Number(r?.n);
}

describe.each(ENGINES)("cuentas y privacidad: %s", (_name, open) => {
  let db: Db;
  afterEach(async () => db?.close());

  it("el registro sin aceptar términos, privacidad o edad falla y no crea la cuenta", async () => {
    db = await seed(open);
    for (const missing of ["acceptTerms", "acceptPrivacy", "isAdult"] as const) {
      await expect(registerUser(db, { ...base, [missing]: false })).rejects.toBeInstanceOf(ConsentRequiredError);
    }
    expect(await getUserByUsername(db, "garra")).toBeNull();
  });

  it("guarda cada consentimiento con su versión", async () => {
    db = await seed(open);
    const user = await registerUser(db, { ...base, isPublic: true });
    const consents = await listConsents(db, user.id);
    expect(consents.map(({ kind, version, granted }) => ({ kind, version, granted }))).toEqual([
      { kind: "terms", version: TERMS_VERSION, granted: true },
      { kind: "privacy", version: PRIVACY_VERSION, granted: true },
      { kind: "age", version: AGE_VERSION, granted: true },
      { kind: "public_profile", version: PRIVACY_VERSION, granted: true },
    ]);
    expect(consents.every((c) => /^\d{4}-\d{2}-\d{2}/.test(c.createdAt))).toBe(true);
    expect(needsAcceptance(await legalStatus(db, user.id))).toBe(false);
  });

  it("los usuarios nuevos son privados por defecto y quedan fuera de los rankings hasta que eligen ser públicos", async () => {
    db = await seed(open);
    const user = await registerUser(db, base);
    expect(user.isPublic).toBe(false);
    await setAttendance(db, user, "a", "propia");
    expect(await fansOfClub(db, "colo-colo")).toEqual([]);
    expect(await clubsByFans(db)).toEqual([]);

    await setPublicProfile(db, user.id, true);
    expect((await fansOfClub(db, "colo-colo")).map((f) => f.username)).toEqual(["garra"]);
    await setPublicProfile(db, user.id, true); // sin cambio: no se registra de nuevo
    await setPublicProfile(db, user.id, false);
    expect(await fansOfClub(db, "colo-colo")).toEqual([]);
    const pub = (await listConsents(db, user.id)).filter((c) => c.kind === "public_profile").map((c) => c.granted);
    expect(pub).toEqual([false, true, false]);
  });

  it("los hinchas antiguos sin consentimiento de perfil público quedan privados al migrar", async () => {
    db = await seed(open);
    const old = await createUser(db, { ...base, isPublic: true });
    await setAttendance(db, old, "a", "propia");
    // Simula el arranque con el esquema nuevo (la migración es idempotente).
    const { schemaFor } = await import("../src/lib/db/schema.ts");
    await db.exec(schemaFor(db.dialect));
    expect((await getUserByUsername(db, "garra"))?.isPublic).toBe(false);
    expect(await fansOfClub(db, "colo-colo")).toEqual([]);
    // Un hincha que eligió ser público no se ve afectado por la migración.
    await setPublicProfile(db, old.id, true);
    await db.exec(schemaFor(db.dialect));
    expect((await getUserByUsername(db, "garra"))?.isPublic).toBe(true);
  });

  it("la exportación incluye perfil, partidos y consentimientos, pero no el hash ni los tokens", async () => {
    db = await seed(open);
    const user = await registerUser(db, base);
    await setAttendance(db, user, "a", "propia");
    await setAttendance(db, user, "b", "infiltrado");
    const { token } = await createSession(db, user.id);
    const data = await exportUserData(db, user.id);
    expect(data.profile).toMatchObject({ username: "garra", email: "g@x.cl", clubId: "colo-colo", isPublic: false });
    expect(data.attendances.map((a) => [a.matchId, a.mode, a.homeTeam, a.homeGoals])).toEqual([
      ["a", "propia", "Colo-Colo", 2],
      ["b", "infiltrado", "Everton", 1],
    ]);
    expect(data.consents).toHaveLength(4);
    expect(data.activeSessions).toHaveLength(1);
    const json = JSON.stringify(data);
    expect(json).not.toMatch(/password|scrypt/i);
    expect(json).not.toContain(token);
  });

  it("eliminar la cuenta exige usuario y contraseña, y borra usuario, sesiones, asistencias y consentimientos", async () => {
    db = await seed(open);
    const user = await registerUser(db, { ...base, isPublic: true });
    const other = await registerUser(db, { ...base, username: "otro", email: "o@x.cl" });
    await setAttendance(db, user, "a", "propia");
    await setAttendance(db, other, "a", "propia");
    const { token } = await createSession(db, user.id);

    await expect(deleteAccount(db, user.id, { username: "otro", password: "secreto123" })).rejects.toBeInstanceOf(AccountError);
    await expect(deleteAccount(db, user.id, { username: "garra", password: "mala" })).rejects.toBeInstanceOf(AccountError);
    expect(await getUserByUsername(db, "garra")).not.toBeNull();

    await deleteAccount(db, user.id, { username: " GARRA ", password: "secreto123" });
    expect(await getUserByUsername(db, "garra")).toBeNull();
    expect(await userForSession(db, token)).toBeNull();
    for (const table of ["sessions", "attendances", "consents"]) expect(await count(db, table, user.id)).toBe(0);
    expect(await authenticate(db, "garra", "secreto123")).toBeNull();
    expect(await fansOfClub(db, "colo-colo")).toEqual([]);
    // Los datos de otros hinchas no se tocan.
    expect(await count(db, "attendances", other.id)).toBe(1);
    expect(await count(db, "consents", other.id)).toBe(4);
  });

  it("cerrar todas las sesiones invalida cada dispositivo", async () => {
    db = await seed(open);
    const user = await registerUser(db, base);
    const s1 = await createSession(db, user.id);
    const s2 = await createSession(db, user.id);
    expect(await deleteUserSessions(db, user.id)).toBe(2);
    expect(await userForSession(db, s1.token)).toBeNull();
    expect(await userForSession(db, s2.token)).toBeNull();
  });

  it("pide reaceptar cuando sube la versión de términos o privacidad", async () => {
    db = await seed(open);
    const user = await registerUser(db, base);
    const next = { ...REQUIRED_DOCS, privacy: "2.0" };
    const status = await legalStatus(db, user.id, next);
    expect(status.pending).toEqual(["privacy"]);
    expect(needsAcceptance(status)).toBe(true);

    await expect(acceptLegal(db, user.id, { acceptTerms: false, acceptPrivacy: false, isAdult: false }, next)).rejects.toBeInstanceOf(
      ConsentRequiredError,
    );
    // Los términos siguen vigentes: no hace falta volver a aceptarlos.
    await acceptLegal(db, user.id, { acceptTerms: false, acceptPrivacy: true, isAdult: false }, next);
    expect(needsAcceptance(await legalStatus(db, user.id, next))).toBe(false);
    const privacy = (await listConsents(db, user.id)).filter((c) => c.kind === "privacy").map((c) => c.version);
    expect(privacy).toEqual([PRIVACY_VERSION, "2.0"]);

    const both = { terms: "3.0", privacy: "3.0" };
    expect((await legalStatus(db, user.id, both)).pending).toEqual(["terms", "privacy"]);
  });

  it("un hincha antiguo sin consentimientos debe aceptar todo, y elige su perfil público una sola vez", async () => {
    db = await seed(open);
    const old = await createUser(db, base);
    const status = await legalStatus(db, old.id);
    expect(status).toEqual({ pending: ["terms", "privacy"], ageDeclared: false, publicChoiceMade: false });
    await expect(acceptLegal(db, old.id, { acceptTerms: true, acceptPrivacy: true, isAdult: false })).rejects.toBeInstanceOf(
      ConsentRequiredError,
    );
    await acceptLegal(db, old.id, { acceptTerms: true, acceptPrivacy: true, isAdult: true, isPublic: true });
    expect(needsAcceptance(await legalStatus(db, old.id))).toBe(false);
    expect((await getUserByUsername(db, "garra"))?.isPublic).toBe(true);
    expect((await listConsents(db, old.id)).map((c) => c.kind)).toEqual(["terms", "privacy", "age", "public_profile"]);
  });
});

describe("concurrencia (revisión QA)", () => {
  it("SQLite: una transacción fallida no deshace lo que otra petición escribió al mismo tiempo", async () => {
    const { openSqlite } = await import("../src/lib/db/client.ts");
    const db = await seed(() => openSqlite(":memory:"));
    const other = await registerUser(db, { ...base, username: "otro", email: "o@x.cl" });
    await registerUser(db, base);
    const r = await Promise.allSettled([registerUser(db, base), setAttendance(db, other, "a", "propia")]);
    expect(r[0].status).toBe("rejected");
    expect(r[1].status).toBe("fulfilled");
    expect(Number((await db.get("SELECT COUNT(*) AS n FROM attendances WHERE user_id = ?", other.id))?.n)).toBe(1);
    await db.close();
  });

  it.each(ENGINES)("%s: aceptar dos veces a la vez no falla ni duplica registros", async (_n, open) => {
    const db = await seed(open);
    const u = await createUser(db, { username: "viejo", email: "v@x.cl", password: "secreto123", clubId: "colo-colo" });
    const input = { acceptTerms: true, acceptPrivacy: true, isAdult: true };
    const r = await Promise.allSettled([acceptLegal(db, u.id, input), acceptLegal(db, u.id, input)]);
    if (db.dialect === "sqlite") expect(r.map((x) => x.status)).toEqual(["fulfilled", "fulfilled"]);
    const kinds = (await listConsents(db, u.id)).map((c) => c.kind).sort();
    expect(kinds).toEqual(["age", "privacy", "terms"]);
    await db.close();
  });
});
