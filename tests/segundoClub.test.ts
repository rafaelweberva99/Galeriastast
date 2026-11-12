import { describe, expect, it } from "vitest";
import { openSqlite } from "../src/lib/db/client.ts";
import { buildSuma } from "../src/lib/domain/suma.ts";
import { AttendanceError, createUser, getSecondClubId, setAttendance, setSecondClub, updateProfile } from "../src/lib/repo/users.ts";
import { match } from "./fixtures.ts";

const A = "a";
const B = "b";
const att = (m: ReturnType<typeof match>) => ({ ...m, mode: "propia" as const });

describe("suma de dos clubes", () => {
  const ms = [
    att(match({ homeTeamId: A, awayTeamId: "x", homeGoals: 2, awayGoals: 0, date: "2024-03-01" })), // A gana
    att(match({ homeTeamId: "y", awayTeamId: B, homeGoals: 1, awayGoals: 1, date: "2024-03-08" })), // B empata
    att(match({ homeTeamId: B, awayTeamId: "z", homeGoals: 0, awayGoals: 3, date: "2024-03-15" })), // B pierde
    att(match({ homeTeamId: A, awayTeamId: B, homeGoals: 1, awayGoals: 0, date: "2024-04-01" })), // entre ambos: cuenta una vez, para A
  ];
  const s = buildSuma(ms, A, B, new Map());

  it("cuenta cada partido una vez y suma los registros", () => {
    expect(s.total).toBe(4);
    expect(s.record).toMatchObject({ played: 4, won: 2, drawn: 1, lost: 1 });
    expect(s.effectiveness).toBeCloseTo(((2 * 3 + 1) / (4 * 3)) * 100);
  });

  it("muestra cada club por separado (el partido entre ambos aparece en los dos)", () => {
    const [a, b] = s.clubs;
    expect(a).toMatchObject({ clubId: A, total: 2 });
    expect(b).toMatchObject({ clubId: B, total: 3 });
  });

  it("sin partidos: todo en cero", () => {
    const e = buildSuma([], A, B, new Map());
    expect(e.total).toBe(0);
    expect(e.effectiveness).toBeNull();
  });
});

async function seed() {
  const db = await openSqlite(":memory:");
  for (const id of ["a", "b", "c", "x"])
    await db.run("INSERT INTO teams (id, name, short_name, color_primary, color_secondary, is_chilean) VALUES (?,?,?,?,?,1)", id, id, id, "#111111", "#ffffff");
  await db.run("INSERT INTO competitions (id, name, kind) VALUES ('c','Liga','liga')");
  const m = (id: string, h: string, a: string) =>
    db.run("INSERT INTO matches (id, date, season, competition_id, home_team_id, away_team_id, home_goals, away_goals, is_final, source, verified) VALUES (?,?,?,?,?,?,1,0,0,'t',1)", id, "2024-03-01", 2024, "c", h, a);
  await m("ma", "a", "x");
  await m("mb", "b", "x");
  await m("mc", "c", "x");
  const user = await createUser(db, { username: "pepe", email: "p@x.cl", password: "claveSegura123", clubId: "a" });
  return { db, user };
}

describe("segundo club: reglas", () => {
  it("permite marcar partidos del club principal y del segundo, no de otros", async () => {
    const { db, user } = await seed();
    await setSecondClub(db, user, "b");
    expect(await getSecondClubId(db, user.id)).toBe("b");
    await setAttendance(db, user, "ma", "propia");
    await setAttendance(db, user, "mb", "propia");
    await expect(setAttendance(db, user, "mc", "propia")).rejects.toBeInstanceOf(AttendanceError);
  });

  it("no puede ser el mismo que el club principal y se puede quitar", async () => {
    const { db, user } = await seed();
    await expect(setSecondClub(db, user, "a")).rejects.toBeInstanceOf(AttendanceError);
    await setSecondClub(db, user, "b");
    await setSecondClub(db, user, null);
    expect(await getSecondClubId(db, user.id)).toBeNull();
  });

  it("si el nuevo club principal es el segundo, el segundo se quita solo", async () => {
    const { db, user } = await seed();
    await setSecondClub(db, user, "b");
    await updateProfile(db, user.id, { clubId: "b" });
    expect(await getSecondClubId(db, user.id)).toBeNull();
  });
});

describe("Galería por club y de los dos juntos", () => {
  it("cada vista cuenta lo suyo y la conjunta suma ambos clubes", async () => {
    const { loadCarnet } = await import("../src/lib/carnet.ts");
    const { db, user } = await seed();
    await setSecondClub(db, user, "b");
    await setAttendance(db, user, "ma", "propia"); // club a, gana 1-0
    await setAttendance(db, user, "mb", "propia"); // club b, gana 1-0
    const principal = await loadCarnet(db, user, "a");
    const segundo = await loadCarnet(db, user, "b");
    const juntos = await loadCarnet(db, user, "a", "b");
    expect(principal.carnet.total).toBe(1);
    expect(principal.attended.map((m) => m.id)).toEqual(["ma"]);
    expect(segundo.carnet.total).toBe(1);
    expect(segundo.attended.map((m) => m.id)).toEqual(["mb"]);
    expect(juntos.carnet.total).toBe(2);
    expect(juntos.carnet.record).toMatchObject({ played: 2, won: 2 });
    expect(juntos.attended.map((m) => m.id).sort()).toEqual(["ma", "mb"]);
    expect(juntos.club.name).toContain("+");
  });
});
