import { afterEach, describe, expect, it } from "vitest";
import type { Db } from "../src/lib/db/client.ts";
import { clubCommunityDetail, communityComparison, communityOverview } from "../src/lib/repo/community.ts";
import { ENGINES } from "./engines.ts";

/** U de Chile con 6 hinchas (5 públicos, 1 privado) y Colo-Colo con 2. */
async function seed(open: () => Promise<Db>): Promise<Db> {
  const db = await open();
  await db.exec(`
    INSERT INTO competitions VALUES ('primera-division', 'Primera División', 'liga', 1);
    INSERT INTO teams (id, name, short_name) VALUES ('colo-colo', 'Colo-Colo', 'Colo-Colo'),
      ('universidad-de-chile', 'Universidad de Chile', 'U. de Chile');
  `);
  // 8 partidos de la U (los 4 primeros ganados, 2 empates, 2 perdidos como local/visita alternados)
  const results: [number, number][] = [[2, 0], [3, 1], [1, 0], [2, 1], [1, 1], [0, 0], [0, 2], [1, 3]];
  for (const [i, [h, a]] of results.entries()) {
    const uHome = i % 2 === 0;
    const gf = uHome ? h : a;
    const ga = uHome ? a : h;
    // Se reordenan para que (gf, ga) sea el resultado de la U.
    await db.run(
      `INSERT INTO matches (id, date, season, competition_id, home_team_id, away_team_id, home_goals, away_goals, source)
       VALUES (?, ?, 2024, 'primera-division', ?, ?, ?, ?, 't')`,
      `m${i}`,
      `2024-0${i + 1}-10`,
      uHome ? "universidad-de-chile" : "colo-colo",
      uHome ? "colo-colo" : "universidad-de-chile",
      uHome ? gf : ga,
      uHome ? ga : gf,
    );
  }
  await db.run("INSERT INTO goals (match_id, team_id, player, own_goal, penalty, source) VALUES ('m0', 'universidad-de-chile', 'Delantero Azul', 0, 0, 't')");
  await db.run("INSERT INTO goals (match_id, team_id, player, own_goal, penalty, source) VALUES ('m0', 'universidad-de-chile', 'Delantero Azul', 0, 0, 't')");
  await db.run("INSERT INTO goals (match_id, team_id, player, own_goal, penalty, source) VALUES ('m5', 'colo-colo', 'Verdugo Albo', 0, 0, 't')");
  // hinchas u1..u6 (u6 privado) con 8,7,6,5,4 y 3 partidos; c1, c2 de Colo-Colo
  const fans: [string, string, number, number][] = [
    ["u1", "universidad-de-chile", 1, 8],
    ["u2", "universidad-de-chile", 1, 7],
    ["u3", "universidad-de-chile", 1, 6],
    ["u4", "universidad-de-chile", 1, 5],
    ["u5", "universidad-de-chile", 1, 4],
    ["u6", "universidad-de-chile", 0, 3],
    ["c1", "colo-colo", 1, 8],
  ];
  for (const [name, club, pub, n] of fans) {
    await db.run("INSERT INTO users (username, email, password_hash, club_id, is_public) VALUES (?, ?, 'x', ?, ?)", name, `${name}@x.cl`, club, pub);
    const id = Number((await db.get("SELECT id FROM users WHERE username = ?", name))!.id);
    for (let i = 0; i < n; i++) await db.run("INSERT INTO attendances (user_id, match_id) VALUES (?, ?)", id, `m${i}`);
  }
  return db;
}

describe.each(ENGINES)("comunidad: %s", (_name, open) => {
  let db: Db;
  afterEach(async () => db?.close());

  it("el panorama oculta cifras bajo 2 hinchas y excluye perfiles privados", async () => {
    db = await seed(open);
    const o = await communityOverview(db);
    expect(o.totalFans).toBe(6);
    const u = o.clubs.find((c) => c.clubId === "universidad-de-chile")!;
    const c = o.clubs.find((c) => c.clubId === "colo-colo")!;
    expect(u.fans).toBe(5);
    expect(u.attended).toBe(8 + 7 + 6 + 5 + 4);
    expect(u.avgAttended).toBe(6);
    expect(c.fans).toBe(1);
    expect(c.attended).toBeNull();
    expect(c.avgEffectiveness).toBeNull();
    expect(c.shares).toBeNull();
  });

  it("detalle del club: partidos más marcados, fieles, goleadores y verdugos", async () => {
    db = await seed(open);
    const d = await clubCommunityDetail(db, "universidad-de-chile");
    expect(d.topAllTime[0]).toMatchObject({ matchId: "m3", fans: 5 });
    expect(d.topAllTime.at(-1)!.fans).toBeGreaterThanOrEqual(2);
    expect(d.faithful.map((f) => [f.rank, f.username, f.attended])).toEqual([[1, "u1", 8], [2, "u2", 7], [3, "u3", 6], [4, "u4", 5], [5, "u5", 4]]);
    expect(d.scorersFor[0]).toMatchObject({ player: "Delantero Azul", goals: 10, fans: 5 });
    expect(d.scorersAgainst[0]).toMatchObject({ player: "Verdugo Albo", team: "Colo-Colo", goals: 3, fans: 3 });
    const small = await clubCommunityDetail(db, "colo-colo");
    expect(small.topAllTime).toEqual([]);
    expect(small.scorersFor).toEqual([]);
    expect(small.faithful).toHaveLength(1); // el ranking de alias públicos sí se muestra
  });

  it("comparación para el carnet: percentil, posición y mínimo de 2 hinchas", async () => {
    db = await seed(open);
    const id = async (n: string) => Number((await db.get("SELECT id FROM users WHERE username = ?", n))!.id);
    const top = (await communityComparison(db, await id("u1")))!;
    expect(top).toMatchObject({ fans: 5, attended: 8, attendedRank: 1, attendedOf: 5, attendedPercentile: 100 });
    const mid = (await communityComparison(db, await id("u3")))!;
    expect(mid).toMatchObject({ attendedRank: 3, attendedPercentile: 50 });
    // u6 es privado: se compara sin contar para el mínimo ni revelarse
    const priv = (await communityComparison(db, await id("u6")))!;
    expect(priv).toMatchObject({ fans: 5, attendedRank: 6, attendedOf: 6, attendedPercentile: 0 });
    expect(await communityComparison(db, await id("c1"))).toBeNull();
    expect(await communityComparison(db, 9999)).toBeNull();
  });
});
