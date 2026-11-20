import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { openSqlite } from "../src/lib/db/client.ts";
import { loadCatalog } from "../src/lib/ingest/catalog.ts";
import { ingestMatchesCsv } from "../src/lib/ingest/load.ts";
import { parseCsv } from "../src/lib/ingest/csv.ts";
import { B_CLUBS, divisionOf, isVisibleClub, MVP_CLUBS } from "../src/lib/mvp.ts";
import { listClubs } from "../src/lib/repo/teams.ts";

const csvPath = path.resolve("data/matches/primera-b.csv");

describe("Primera B", () => {
  it("los clubes de B están habilitados y no se mezclan con los de Primera", () => {
    expect(B_CLUBS).toHaveLength(16);
    for (const id of B_CLUBS) {
      expect(isVisibleClub(id)).toBe(true);
      expect(divisionOf(id)).toBe("b");
      expect(MVP_CLUBS).not.toContain(id);
    }
    expect(divisionOf("colo-colo")).toBe("primera");
  });

  it("el CSV de B no tiene partidos repetidos ni sin resultado, y cada club de B 2026 aparece en la temporada", () => {
    const rows = parseCsv(readFileSync(csvPath, "utf8"));
    expect(rows.length).toBeGreaterThan(2500);
    const keys = new Set(rows.map((r) => `${r.date}|${r.home}|${r.away}`));
    expect(keys.size).toBe(rows.length);
    expect(rows.every((r) => r.home_goals !== "" && r.away_goals !== "")).toBe(true);
    expect(rows.every((r) => r.competition_id === "primera-b")).toBe(true);
  });

  it("al cargar la B, sus 16 clubes aparecen como clubes de división B y los rivales antiguos no", async () => {
    const db = await openSqlite(":memory:");
    const resolver = await loadCatalog(db);
    const r = await ingestMatchesCsv(db, "primera-b.csv", readFileSync(csvPath, "utf8"), resolver);
    expect(r.rejected).toEqual([]);
    const clubs = await listClubs(db);
    const b = clubs.filter((c) => c.division === "b").map((c) => c.id).sort();
    expect(b).toEqual([...B_CLUBS].sort());
    expect(clubs.find((c) => c.id === "lota-schwager")).toBeUndefined();
    expect(clubs.find((c) => c.id === "cobreloa")?.matches).toBeGreaterThan(0);
  });
});
