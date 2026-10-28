import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { Db } from "../src/lib/db/client.ts";
import { TeamResolver } from "../src/lib/domain/normalize.ts";
import { ingestWfb } from "../src/lib/ingest/load.ts";
import { crossCheck, runQualityChecks } from "../src/lib/ingest/quality.ts";
import { datasetSummary, listAttended, listClubMatches, competitionsForClub } from "../src/lib/repo/matches.ts";
import { clubsByFans, fansOfClub } from "../src/lib/repo/rankings.ts";
import { listClubs } from "../src/lib/repo/teams.ts";
import {
  AttendanceError,
  authenticate,
  createSession,
  createUser,
  setAttendance,
  userForSession,
  UserExistsError,
} from "../src/lib/repo/users.ts";
import { ENGINES } from "./engines.ts";

async function seed(open: () => Promise<Db>): Promise<Db> {
  const db = await open();
  await db.exec(`
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

describe.each(ENGINES)("base de datos: %s", (_name, open) => {
  let db: Db;
  afterEach(async () => db?.close());

  it("registra, autentica (sin distinguir mayúsculas) y maneja sesiones", async () => {
    db = await seed(open);
    const user = await createUser(db, { username: "Garra", email: "g@x.cl", password: "secreto123", clubId: "colo-colo" });
    expect((await authenticate(db, "garra", "secreto123"))?.id).toBe(user.id);
    expect(await authenticate(db, "G@X.CL", "otra")).toBeNull();
    await expect(
      createUser(db, { username: "GARRA", email: "otro@x.cl", password: "secreto123", clubId: "colo-colo" }),
    ).rejects.toBeInstanceOf(UserExistsError);
    const { token } = await createSession(db, user.id);
    expect((await userForSession(db, token))?.username).toBe("Garra");
  });

  it("marca partidos solo del propio club y ya jugados, y arma rankings", async () => {
    db = await seed(open);
    const user = await createUser(db, { username: "garra", email: "g@x.cl", password: "secreto123", clubId: "colo-colo" });
    await setAttendance(db, user, "a", "propia");
    await setAttendance(db, user, "b", "infiltrado");
    await setAttendance(db, user, "b", "infiltrado"); // idempotente
    await expect(setAttendance(db, user, "c", "propia")).rejects.toBeInstanceOf(AttendanceError);
    await expect(setAttendance(db, user, "d", "propia")).rejects.toBeInstanceOf(AttendanceError);

    const att = await listAttended(db, user.id);
    expect(att.map((m) => [m.id, m.mode])).toEqual([
      ["a", "propia"],
      ["b", "infiltrado"],
    ]);
    const [fan] = await fansOfClub(db, "colo-colo");
    expect(fan).toMatchObject({ username: "garra", attended: 2, won: 1, drawn: 1, lost: 0 });
    expect(await clubsByFans(db)).toEqual([{ clubId: "colo-colo", name: "Colo-Colo", fans: 1, attendances: 2 }]);
  });

  it("consulta partidos, competiciones y resumen", async () => {
    db = await seed(open);
    expect((await listClubMatches(db, "colo-colo", { season: 2024 })).map((m) => m.id)).toEqual(["b", "a"]);
    expect(await competitionsForClub(db, "colo-colo")).toMatchObject([{ id: "primera-division" }]);
    expect(await datasetSummary(db)).toMatchObject({ matches: 4, teams: 3, competitions: 1, firstSeason: 2024 });
    expect((await listClubs(db)).map((c) => c.id)).toEqual(["colo-colo", "everton", "universidad-de-chile"]);
  });

  it("detecta problemas de calidad y verifica contra segunda fuente", async () => {
    db = await seed(open);
    await db.exec(`INSERT INTO matches (id, date, season, competition_id, home_team_id, away_team_id, home_goals, away_goals, source)
                   VALUES ('dup', '2024-03-01', 2024, 'primera-division', 'everton', 'colo-colo', 0, 0, 't')`);
    expect((await runQualityChecks(db, "2030-01-01")).some((i) => i.check === "equipo-dos-veces-mismo-dia")).toBe(true);

    const resolver = new TeamResolver([
      { id: "colo-colo", name: "Colo-Colo" },
      { id: "universidad-de-chile", name: "Universidad de Chile", aliases: ["U. de Chile"] },
      { id: "everton", name: "Everton" },
    ]);
    const res = await crossCheck(
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

  it("carga archivos Football.TXT por lotes y omite los que no cambiaron", async () => {
    db = await open();
    const dir = mkdtempSync(path.join(tmpdir(), "wfb-"));
    writeFileSync(
      path.join(dir, "2005_cl.1.txt"),
      `= CL 1 2005\n\n# Date       Fri Jan/21 - Thu Dec/22 2005 (335d)\n\n== Apertura\n\nMatchday 1\n[Fri Jan/21]\n  17.00  Huachipato               4-1  La Serena\n  21.00  Everton                  3-2  Universidad de Chile\n[Sun Jan/23]\n  18.00  Colo-Colo                2-0  Puerto Montt\n         Club Inventado           1-1  Colo-Colo\n`,
    );
    const first = await ingestWfb(db, dir);
    expect(first.total).toBe(4);
    expect(first.unknownTeams).toEqual(["Club Inventado"]);
    const again = await ingestWfb(db, dir);
    expect(again.files[0].unchanged).toBe(true);
    const cc = await listClubMatches(db, "colo-colo");
    expect(cc.map((m) => `${m.date} ${m.homeTeamName} ${m.homeGoals}-${m.awayGoals} ${m.awayTeamName}`)).toEqual([
      "2005-01-23 Colo-Colo 2-0 Deportes Puerto Montt",
      "2005-01-23 Club Inventado 1-1 Colo-Colo",
    ]);
    expect(cc[0].tournament).toBe("Apertura 2005");
    expect(cc[0].stage).toBe("Fecha 1");
  });
});

describe.each(ENGINES)("goleadores: %s", (_name, open) => {
  let db: Db;
  afterEach(async () => db?.close());

  it("carga goles, aplica correcciones y alias, y rechaza filas inválidas", async () => {
    db = await seed(open);
    const { loadGoals, parseGoalsCsv, parsePlayersCsv } = await import("../src/lib/ingest/goals.ts");
    const { goalsForMatches } = await import("../src/lib/repo/goals.ts");
    const players = parsePlayersCsv("player,canonical_name,notes\nE. Paredes,Esteban Paredes,\n");
    const csv = [
      "match_id,date,home_team_id,away_team_id,scoring_team_id,player,minute,own_goal,penalty,source",
      "a,2024-03-01,colo-colo,universidad-de-chile,colo-colo,E. Paredes,10,0,1,test",
      "a,2024-03-01,colo-colo,universidad-de-chile,colo-colo,Pérez,50,1,0,test",
      "b,2024-04-01,everton,colo-colo,everton,Fulano,3,0,0,test",
      "c,2024-05-01,everton,universidad-de-chile,colo-colo,Intruso,1,0,0,test",
      "zzz,2024-05-01,everton,colo-colo,everton,Fantasma,1,0,0,test",
    ].join("\n");
    const corrections = parseGoalsCsv(
      "match_id,date,home_team_id,away_team_id,scoring_team_id,player,minute,own_goal,penalty,source\n" +
        "b,2024-04-01,everton,colo-colo,everton,Fulano,3,0,0,prensa\nb,2024-04-01,everton,colo-colo,colo-colo,Esteban Paredes,88,0,0,prensa\n",
    );
    const report = await loadGoals(db, parseGoalsCsv(csv, players), corrections);
    expect(report.rejected).toHaveLength(2);
    expect(report.complete).toBe(2);
    const goals = await goalsForMatches(db, ["a", "b"]);
    expect(goals.get("a")!.map((g) => [g.player, g.penalty, g.ownGoal])).toEqual([
      ["Esteban Paredes", true, false],
      ["Pérez", false, true],
    ]);
    expect(goals.get("b")).toHaveLength(2);
    // recargar reemplaza, no duplica
    await loadGoals(db, parseGoalsCsv(csv, players), corrections);
    expect((await goalsForMatches(db, ["a"])).get("a")).toHaveLength(2);
    expect((await runQualityChecks(db, "2030-01-01")).filter((i) => i.check === "goles-no-cuadran")).toHaveLength(0);
  });
});

describe.each(ENGINES)("partidos en CSV: %s", (_name, open) => {
  let db: Db;
  afterEach(async () => db?.close());

  it("carga partidos jugados y por jugar, crea rivales extranjeros y rechaza filas malas", async () => {
    db = await open();
    const { loadCatalog } = await import("../src/lib/ingest/catalog.ts");
    const { ingestMatchesCsv } = await import("../src/lib/ingest/load.ts");
    const resolver = await loadCatalog(db);
    const csv = [
      "date,competition_id,season,tournament,stage,home,away,home_goals,away_goals,home_pens,away_pens,is_final,venue,source",
      "2025-11-02,primera-division,2025,Liga de Primera 2025,Fecha 27,coquimbo-unido,union-la-calera,2,0,,,0,,prensa",
      "2026-04-08,copa-libertadores,2026,Copa Libertadores 2026,Fase de grupos,Colo-Colo,Flamengo (BRA),1,1,,,0,,prensa",
      "2026-12-06,primera-division,2026,Liga de Primera 2026,Fecha 30,colo-colo,universidad-de-chile,,,,,0,,fixture",
      "2026-05-01,copa-inventada,2026,X,,colo-colo,everton,1,0,,,0,,x",
      "2026-05-02,primera-division,2026,X,,colo-colo,everton,1,,,,0,,x",
    ].join("\n");
    const r = await ingestMatchesCsv(db, "2025-2026.csv", csv, resolver);
    expect(r.loaded).toBe(3);
    expect(r.rejected).toHaveLength(2);
    const futuro = await db.get("SELECT home_goals FROM matches WHERE id = '2026-12-06_colo-colo_universidad-de-chile'");
    expect(futuro?.home_goals).toBeNull();
    expect((await db.get("SELECT is_chilean FROM teams WHERE id = 'flamengo-bra'"))?.is_chilean).toBe(0);
    const { upcomingClubMatches } = await import("../src/lib/repo/matches.ts");
    const next = await upcomingClubMatches(db, "colo-colo", "2026-10-28");
    expect(next.map((m) => m.id)).toEqual(["2026-12-06_colo-colo_universidad-de-chile"]);
  });
});
