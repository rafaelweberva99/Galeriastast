import { afterEach, describe, expect, it } from "vitest";
import { openSqlite, type Db } from "../src/lib/db/client.ts";
import { analyzeSheet, splitSheet } from "../src/lib/ingest/sheet.ts";
import { isAdmin } from "../src/lib/admin.ts";

const TEAMS = [
  { id: "universidad-de-chile", name: "Universidad de Chile", short: "U. de Chile" },
  { id: "colo-colo", name: "Colo-Colo", short: "Colo-Colo" },
  { id: "palestino", name: "Palestino", short: "Palestino" },
];

async function seed(): Promise<Db> {
  const db = await openSqlite(":memory:");
  await db.exec(`
    INSERT INTO competitions VALUES ('primera-division', 'Primera División', 'liga', 1);
    INSERT INTO competitions VALUES ('copa-libertadores', 'Copa Libertadores', 'internacional', 3);
    INSERT INTO teams (id, name, short_name) VALUES ('universidad-de-chile', 'Universidad de Chile', 'U. de Chile'),
      ('colo-colo', 'Colo-Colo', 'Colo-Colo'), ('palestino', 'Palestino', 'Palestino');
    INSERT INTO teams (id, name, short_name, is_chilean) VALUES ('racing-club-arg', 'Racing Club', 'Racing Club', 0);
    INSERT INTO matches (id, date, season, competition_id, home_team_id, away_team_id, home_goals, away_goals, source) VALUES
      ('2017-03-05_palestino_universidad-de-chile', '2017-03-05', 2017, 'primera-division', 'palestino', 'universidad-de-chile', 1, 3, 't'),
      ('2017-10-22_universidad-de-chile_palestino', '2017-10-22', 2017, 'primera-division', 'universidad-de-chile', 'palestino', 2, 1, 't'),
      ('2024-08-10_universidad-de-chile_colo-colo', '2024-08-10', 2024, 'primera-division', 'universidad-de-chile', 'colo-colo', 0, 0, 't'),
      ('2018-04-03_universidad-de-chile_racing-club-arg', '2018-04-03', 2018, 'copa-libertadores', 'universidad-de-chile', 'racing-club-arg', 1, 1, 't');
  `);
  return db;
}

describe("importar planilla", () => {
  let db: Db;
  afterEach(async () => db?.close());

  it("separa celdas de Excel pegado (tabuladores) y de CSV con comillas", () => {
    expect(splitSheet("Año\tRival\n2017\tPalestino")).toEqual([["Año", "Rival"], ["2017", "Palestino"]]);
    expect(splitSheet('fecha;rival\n10-08-2024;"Colo-Colo; Monumental"')).toEqual([["fecha", "rival"], ["10-08-2024", "Colo-Colo; Monumental"]]);
  });

  it("reconoce por código, por fecha y por año + rival + localía + resultado", async () => {
    db = await seed();
    const text = [
      "Año\tLocal\tResultado\tRival",
      "x\t2024-08-10_universidad-de-chile_colo-colo",
      "10/08/2024\tUCH\t0-0\tcc",
      "2017\tUCH\t2--1\tPalestino",
      "2017\tPalestino\t1-3\tUCH",
      "2018\tUCH\t1--1\tRacing",
    ].join("\n");
    const rows = await analyzeSheet(db, "universidad-de-chile", text, TEAMS);
    expect(rows.map((r) => r.match?.id ?? r.problem)).toEqual([
      "2024-08-10_universidad-de-chile_colo-colo",
      "2024-08-10_universidad-de-chile_colo-colo",
      "2017-10-22_universidad-de-chile_palestino",
      "2017-03-05_palestino_universidad-de-chile",
      "2018-04-03_universidad-de-chile_racing-club-arg",
    ]);
  });

  it("no adivina: un resultado que no calza queda para revisar con el partido posible", async () => {
    db = await seed();
    const rows = await analyzeSheet(db, "universidad-de-chile", "2017\tUCH\t3-1\tPalestino\n2016\tUCH\t3-0\tPeñarol", TEAMS);
    expect(rows[0].match).toBeUndefined();
    expect(rows[0].options?.map((m) => m.id)).toEqual([
      "2017-10-22_universidad-de-chile_palestino",
      "2017-03-05_palestino_universidad-de-chile",
    ]);
    expect(rows[1].problem).toBe("no reconocimos al rival");
  });
});

describe("administradores", () => {
  it("se definen por correo en ADMIN_EMAILS, sin distinguir mayúsculas", () => {
    process.env.ADMIN_EMAILS = " GaluchaStats@gmail.com , otro@example.com";
    expect(isAdmin({ email: "galuchastats@gmail.com" })).toBe(true);
    expect(isAdmin({ email: "hincha@example.com" })).toBe(false);
    expect(isAdmin(null)).toBe(false);
    delete process.env.ADMIN_EMAILS;
    expect(isAdmin({ email: "galuchastats@gmail.com" })).toBe(false);
  });
});
