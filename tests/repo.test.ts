import { describe, expect, it } from "vitest";
import { openDb } from "../src/lib/db/client.ts";
import { TeamResolver } from "../src/lib/domain/normalize.ts";
import { crossCheck, runQualityChecks } from "../src/lib/ingest/quality.ts";
import { listAttended } from "../src/lib/repo/matches.ts";
import { fansOfClub } from "../src/lib/repo/rankings.ts";
import { authenticate, createUser, setAttendance, AttendanceError } from "../src/lib/repo/users.ts";

function seed() {
  const db = openDb(":memory:");
  db.exec(`
    INSERT INTO competitions VALUES ('primera-division', 'Primera División', 'liga', 1);
    INSERT INTO teams (id, name, short_name) VALUES ('colo-colo', 'Colo-Colo', 'Colo-Colo'),
      ('universidad-de-chile', 'Universidad de Chile', 'U. de Chile'), ('everton', 'Everton', 'Everton');
    INSERT INTO matches (id, date, season, competition_id, home_team_id, away_team_id, home_goals, away_goals, source) VALUES
      ('a', '2024-03-01', 2024, 'primera-division', 'colo-colo', 'universidad-de-chile', 2, 0, 't'),
      ('b', '2024-04-01', 2024, 'primera-division', 'everton', 'colo-colo', 1, 1, 't'),
      ('c', '2024-05-01', 2024, 'primera-division', 'everton', 'universidad-de-chile', 3, 0, 't'),
      ('d', '2999-01-01', 2999, 'primera-division', 'colo-colo', 'everton', NULL, NULL, 't');
  `);
  return db;
}

describe("usuarios y asistencias", () => {
  it("registra, autentica y marca partidos solo del propio club y ya jugados", () => {
    const db = seed();
    const user = createUser(db, { username: "garra", email: "g@x.cl", password: "secreto123", clubId: "colo-colo" });
    expect(authenticate(db, "garra", "secreto123")?.id).toBe(user.id);
    expect(authenticate(db, "g@x.cl", "otra")).toBeNull();

    setAttendance(db, user, "a", "propia");
    setAttendance(db, user, "b", "infiltrado");
    expect(() => setAttendance(db, user, "c", "propia")).toThrow(AttendanceError);
    expect(() => setAttendance(db, user, "d", "propia")).toThrow(AttendanceError);

    const att = listAttended(db, user.id);
    expect(att.map((m) => [m.id, m.mode])).toEqual([["a", "propia"], ["b", "infiltrado"]]);

    const [fan] = fansOfClub(db, "colo-colo");
    expect(fan).toMatchObject({ username: "garra", attended: 2, won: 1, drawn: 1, lost: 0 });
  });
});

describe("calidad de datos", () => {
  it("detecta un equipo con dos partidos el mismo día y verifica contra segunda fuente", () => {
    const db = seed();
    db.exec(`INSERT INTO matches (id, date, season, competition_id, home_team_id, away_team_id, home_goals, away_goals, source)
             VALUES ('dup', '2024-03-01', 2024, 'primera-division', 'everton', 'colo-colo', 0, 0, 't')`);
    expect(runQualityChecks(db, "2030-01-01").some((i) => i.check === "equipo-dos-veces-mismo-dia")).toBe(true);

    const resolver = new TeamResolver([
      { id: "colo-colo", name: "Colo-Colo" },
      { id: "universidad-de-chile", name: "Universidad de Chile", aliases: ["U. de Chile"] },
      { id: "everton", name: "Everton" },
    ]);
    const res = crossCheck(
      db,
      [
        { date: "2024-03-02", home: "Colo-Colo", away: "U. de Chile", homeGoals: 2, awayGoals: 0 },
        { date: "2024-05-01", home: "Everton", away: "U. de Chile", homeGoals: 2, awayGoals: 0 },
      ],
      (n) => resolver.resolve(n),
    );
    expect(res.matched).toBe(1);
    expect(res.mismatched).toHaveLength(1);
  });
});
