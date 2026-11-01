import { describe, expect, it } from "vitest";
import { openSqlite } from "../src/lib/db/client.ts";
import { loadCarnet } from "../src/lib/carnet.ts";
import { reconcileRescheduled } from "../src/lib/ingest/load.ts";
import { createUser, setAttendance } from "../src/lib/repo/users.ts";

const day = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);

async function seed() {
  const db = await openSqlite(":memory:");
  await db.exec(`
    INSERT INTO competitions VALUES ('primera-division', 'Primera División', 'liga', 1);
    INSERT INTO teams (id, name, short_name) VALUES ('colo-colo', 'Colo-Colo', 'Colo-Colo'), ('nublense', 'Ñublense', 'Ñublense'),
      ('everton', 'Everton', 'Everton');
    INSERT INTO matches (id, date, season, competition_id, stage, home_team_id, away_team_id, home_goals, away_goals, source) VALUES
      ('pasado', '${day(-10)}', 2026, 'primera-division', 'Fecha 25', 'colo-colo', 'everton', 2, 0, 'csv'),
      ('proximo', '${day(7)}', 2026, 'primera-division', 'Fecha 27', 'nublense', 'colo-colo', NULL, NULL, 'csv'),
      ('lejano', '${day(500)}', 2027, 'primera-division', 'Fecha 1', 'colo-colo', 'nublense', NULL, NULL, 'csv');
  `);
  const user = await createUser(db, { username: "albo", email: "albo@example.com", password: "clave-segura-123", clubId: "colo-colo" });
  return { db, user };
}

describe("partidos que vienen", () => {
  it("se pueden marcar ('Voy') hasta un año antes, pero no cuentan en el carnet hasta jugarse", async () => {
    const { db, user } = await seed();
    await setAttendance(db, user, "pasado", "propia");
    await setAttendance(db, user, "proximo", "propia");
    await expect(setAttendance(db, user, "lejano", "propia")).rejects.toThrow(/lejano/);
    const c = await loadCarnet(db, user);
    expect(c.carnet.total).toBe(1);
    expect(c.upcoming.map((m) => m.id)).toEqual(["proximo"]);
    await db.close();
  });

  it("un partido reprogramado pasa a su nueva fecha con las asistencias marcadas", async () => {
    const { db, user } = await seed();
    await setAttendance(db, user, "proximo", "propia");
    await db.exec(`INSERT INTO matches (id, date, season, competition_id, stage, home_team_id, away_team_id, source)
      VALUES ('proximo-nueva-fecha', '${day(6)}', 2026, 'primera-division', 'Fecha 27', 'nublense', 'colo-colo', 'csv')`);
    expect(await reconcileRescheduled(db, new Set(["pasado", "proximo-nueva-fecha", "lejano"]))).toBe(1);
    expect(await db.get("SELECT id FROM matches WHERE id = 'proximo'")).toBeUndefined();
    expect((await db.get("SELECT match_id FROM attendances WHERE user_id = ?", user.id))?.match_id).toBe("proximo-nueva-fecha");
    await db.close();
  });
});
