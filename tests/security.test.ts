import { createHash, randomBytes, scryptSync } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import type { Db } from "../src/lib/db/client.ts";
import { jerseySvg, type ClubIdentity } from "../src/lib/clubTheme.ts";
import { clearFailures, lockedUntil, recordFailure, RULES, throttleKey } from "../src/lib/repo/throttle.ts";
import {
  authenticate,
  createSession,
  createUser,
  deleteSession,
  hashPassword,
  needsRehash,
  removeAttendance,
  safeDecode,
  setAttendance,
  userForSession,
  verifyPassword,
} from "../src/lib/repo/users.ts";
import { ENGINES } from "./engines.ts";

const MIN = 60_000;

async function seed(open: () => Promise<Db>): Promise<Db> {
  const db = await open();
  await db.exec(`
    INSERT INTO competitions VALUES ('primera-division', 'Primera División', 'liga', 1);
    INSERT INTO teams (id, name, short_name) VALUES ('colo-colo', 'Colo-Colo', 'Colo-Colo'), ('everton', 'Everton', 'Everton');
    INSERT INTO matches (id, date, season, competition_id, home_team_id, away_team_id, home_goals, away_goals, source) VALUES
      ('a', '2024-03-01', 2024, 'primera-division', 'colo-colo', 'everton', 2, 0, 't');
  `);
  return db;
}

describe("contraseñas", () => {
  it("hash con sal y parámetros vigentes; verifica en tiempo constante", async () => {
    const h1 = await hashPassword("secreto123");
    const h2 = await hashPassword("secreto123");
    expect(h1).not.toBe(h2);
    expect(h1).toMatch(/^scrypt\$16384,8,5\$[0-9a-f]{32}\$[0-9a-f]{128}$/);
    expect(await verifyPassword("secreto123", h1)).toBe(true);
    expect(await verifyPassword("secreto124", h1)).toBe(false);
    expect(needsRehash(h1)).toBe(false);
  });

  it("acepta los hashes antiguos (scrypt$sal$hash) y pide recalcularlos", async () => {
    const salt = randomBytes(16);
    const legacy = `scrypt$${salt.toString("hex")}$${scryptSync("vieja-clave", salt, 64).toString("hex")}`;
    expect(await verifyPassword("vieja-clave", legacy)).toBe(true);
    expect(await verifyPassword("otra", legacy)).toBe(false);
    expect(needsRehash(legacy)).toBe(true);
  });

  it("rechaza hashes malformados o con parámetros desmedidos y contraseñas gigantes", async () => {
    expect(await verifyPassword("x", "bcrypt$abc$def")).toBe(false);
    expect(await verifyPassword("x", "scrypt$1048576,8,1$00$00")).toBe(false);
    expect(await verifyPassword("x".repeat(10_000), await hashPassword("x"))).toBe(false);
  });
});

describe("camiseta SVG (va como HTML crudo)", () => {
  const club = {
    id: "x",
    short: `Club"><script>alert(1)</script>`,
    jersey: { body: "red\" onload=\"alert(1)", sleeves: "#fff", collar: "#000", trim: "#000", motif: "plain", motifColor: "#fff" },
  } as unknown as ClubIdentity;

  it("no deja pasar texto, colores ni dorsales que no lo sean", () => {
    const svg = jerseySvg(club, 48, `<img src=x onerror=alert(1)>`);
    expect(svg).not.toContain("<script");
    expect(svg).not.toContain("onload");
    expect(svg).not.toContain("<img");
    expect(svg).toContain("&lt;script&gt;");
    expect(jerseySvg(club, 48, "12")).toContain(">12</text>");
  });
});

it("safeDecode no revienta con un % suelto", () => {
  expect(safeDecode("%E0%A4%A")).toBe("%E0%A4%A");
  expect(safeDecode("Garra%5F1")).toBe("Garra_1");
});

describe.each(ENGINES)("seguridad: %s", (_name, open) => {
  let db: Db;
  afterEach(async () => db?.close());

  it("bloquea una cuenta tras 5 fallos y alarga el bloqueo con cada fallo extra", async () => {
    db = await seed(open);
    const key = throttleKey("login", "Garra@x.cl");
    expect(key).toBe(throttleKey("login", "  garra@X.CL "));
    expect(key).not.toContain("garra");
    const t0 = new Date("2026-01-01T12:00:00Z");
    for (let i = 1; i < RULES.login.limit; i++) {
      const r = await recordFailure(db, key, t0);
      expect(r).toEqual({ failures: i, lockedUntil: null });
    }
    expect(await lockedUntil(db, [key], t0)).toBeNull();
    const fifth = await recordFailure(db, key, t0);
    expect(fifth.lockedUntil?.getTime()).toBe(t0.getTime() + RULES.login.baseLockMs);
    expect((await lockedUntil(db, [key], t0))?.getTime()).toBe(t0.getTime() + RULES.login.baseLockMs);
    // Pasado el bloqueo, un nuevo fallo bloquea el doble.
    const t1 = new Date(t0.getTime() + 2 * MIN);
    expect(await lockedUntil(db, [key], t1)).toBeNull();
    const sixth = await recordFailure(db, key, t1);
    expect(sixth.lockedUntil?.getTime()).toBe(t1.getTime() + 2 * RULES.login.baseLockMs);
    // El bloqueo nunca pasa del máximo.
    let last = sixth;
    for (let i = 0; i < 30; i++) last = await recordFailure(db, key, t1);
    expect(last.lockedUntil?.getTime()).toBe(t1.getTime() + RULES.login.maxLockMs);
  });

  it("un ingreso correcto o una hora sin fallos borran la cuenta; las claves son independientes", async () => {
    db = await seed(open);
    const a = throttleKey("login", "a");
    const b = throttleKey("login", "b");
    const ip = throttleKey("ip", "1.2.3.4");
    const t0 = new Date("2026-01-01T12:00:00Z");
    for (let i = 0; i < 4; i++) await recordFailure(db, a, t0);
    await clearFailures(db, a);
    expect((await recordFailure(db, a, t0)).failures).toBe(1);
    const later = new Date(t0.getTime() + RULES.login.windowMs + 1);
    expect((await recordFailure(db, a, later)).failures).toBe(1);
    expect((await recordFailure(db, b, later)).failures).toBe(1);
    // La IP tiene su propio límite, más holgado.
    for (let i = 1; i < RULES.ip.limit; i++) expect((await recordFailure(db, ip, later)).lockedUntil).toBeNull();
    expect((await recordFailure(db, ip, later)).lockedUntil).not.toBeNull();
    expect(await lockedUntil(db, [a, ip], later)).not.toBeNull();
    expect(await lockedUntil(db, [a, b], later)).toBeNull();
  });

  it("los fallos simultáneos se suman todos (sin carreras)", async () => {
    db = await seed(open);
    const key = throttleKey("ip", "9.9.9.9");
    const now = new Date();
    await Promise.all(Array.from({ length: 12 }, () => recordFailure(db, key, now)));
    expect((await recordFailure(db, key, now)).failures).toBe(13);
  });

  it("las sesiones se guardan como hash y se invalidan al cerrar", async () => {
    db = await seed(open);
    const user = await createUser(db, { username: "garra", email: "g@x.cl", password: "secreto123", clubId: "colo-colo" });
    const { token } = await createSession(db, user.id);
    const row = await db.get<{ token: string }>("SELECT token FROM sessions WHERE user_id = ?", user.id);
    expect(row?.token).not.toBe(token);
    expect(row?.token).toBe(createHash("sha256").update(token).digest("hex"));
    expect((await userForSession(db, token))?.id).toBe(user.id);
    // Conocer el hash guardado no sirve como cookie.
    expect(await userForSession(db, row!.token)).toBeNull();
    await deleteSession(db, token);
    expect(await userForSession(db, token)).toBeNull();
  });

  it("al crear una sesión se borran las vencidas del hincha", async () => {
    db = await seed(open);
    const user = await createUser(db, { username: "garra", email: "g@x.cl", password: "secreto123", clubId: "colo-colo" });
    await db.run("INSERT INTO sessions (token, user_id, expires_at) VALUES ('viejo', ?, '2000-01-01T00:00:00.000Z')", user.id);
    await createSession(db, user.id);
    expect(await db.get("SELECT 1 AS x FROM sessions WHERE token = 'viejo'")).toBeUndefined();
  });

  it("un hash antiguo se actualiza solo al ingresar", async () => {
    db = await seed(open);
    const user = await createUser(db, { username: "garra", email: "g@x.cl", password: "secreto123", clubId: "colo-colo" });
    const salt = randomBytes(16);
    const legacy = `scrypt$${salt.toString("hex")}$${scryptSync("secreto123", salt, 64).toString("hex")}`;
    await db.run("UPDATE users SET password_hash = ? WHERE id = ?", legacy, user.id);
    expect((await authenticate(db, "garra", "secreto123"))?.id).toBe(user.id);
    const r = await db.get<{ password_hash: string }>("SELECT password_hash FROM users WHERE id = ?", user.id);
    expect(needsRehash(r!.password_hash)).toBe(false);
    expect((await authenticate(db, "G@X.CL", "secreto123"))?.id).toBe(user.id);
    expect(await authenticate(db, "nadie", "secreto123")).toBeNull();
  });

  it("las asistencias solo tocan al hincha de la sesión", async () => {
    db = await seed(open);
    const a = await createUser(db, { username: "garra", email: "g@x.cl", password: "secreto123", clubId: "colo-colo" });
    const b = await createUser(db, { username: "otro", email: "o@x.cl", password: "secreto123", clubId: "colo-colo" });
    await setAttendance(db, a, "a", "propia");
    // b intenta borrar el partido de a: solo puede borrar los suyos.
    await removeAttendance(db, b.id, "a");
    expect(await db.get("SELECT 1 AS x FROM attendances WHERE user_id = ? AND match_id = 'a'", a.id)).toBeDefined();
  });
});
