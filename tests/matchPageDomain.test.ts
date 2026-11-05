import { describe, expect, it } from "vitest";
import { goalCoverage, headToHead, matchPhase, matchTitle, summarizeCrowd, countdownText, daysUntil } from "../src/lib/domain/matchPage.ts";
import { match } from "./fixtures.ts";

describe("fase y título", () => {
  it("distingue futuro, jugado y suspendido", () => {
    expect(matchPhase({ date: "2030-01-01", homeGoals: null, awayGoals: null, homePens: null }, "2026-01-01")).toBe("futuro");
    expect(matchPhase({ date: "2020-01-01", homeGoals: null, awayGoals: null, homePens: null }, "2026-01-01")).toBe("suspendido");
    expect(matchPhase({ date: "2020-01-01", homeGoals: 1, awayGoals: 0, homePens: null }, "2026-01-01")).toBe("jugado");
  });
  it("arma el título y la cuenta regresiva", () => {
    const m = match({ homeTeamId: "x", awayTeamId: "y", homeGoals: 5, awayGoals: 0 });
    expect(matchTitle(m, "U. de Chile", "Guaraní")).toContain("U. de Chile 5-0 Guaraní");
    expect(daysUntil("2026-01-11", "2026-01-01")).toBe(10);
    expect(countdownText(1)).toBe("Es mañana");
  });
});

describe("goles", () => {
  it("detecta cobertura completa, parcial y ninguna", () => {
    const m = match({ homeTeamId: "x", awayTeamId: "y", homeGoals: 2, awayGoals: 0 });
    const g = (n: number) => Array.from({ length: n }, () => ({ matchId: m.id, teamId: m.homeTeamId, player: "X", minute: 1, ownGoal: false, penalty: false }));
    expect(goalCoverage(m, g(2))).toBe("completa");
    expect(goalCoverage(m, g(1))).toBe("parcial");
    expect(goalCoverage(m, [])).toBe("ninguna");
  });
});

describe("historial", () => {
  it("cuenta G-E-P desde un equipo y excluye el partido actual", () => {
    const base = { homePens: null, awayPens: null, competitionName: "L", season: 2020 };
    const rows = [
      { ...base, id: "a", date: "2020-01-01", homeTeamId: "x", awayTeamId: "y", homeGoals: 2, awayGoals: 0 },
      { ...base, id: "b", date: "2021-01-01", homeTeamId: "y", awayTeamId: "x", homeGoals: 1, awayGoals: 1 },
      { ...base, id: "c", date: "2022-01-01", homeTeamId: "y", awayTeamId: "x", homeGoals: 3, awayGoals: 0 },
      { ...base, id: "cur", date: "2023-01-01", homeTeamId: "x", awayTeamId: "y", homeGoals: 9, awayGoals: 0 },
    ];
    const h = headToHead(rows, "x", "cur");
    expect([h.played, h.won, h.drawn, h.lost]).toEqual([3, 1, 1, 1]);
    expect(h.last[0].id).toBe("c");
  });
});

describe("hinchada (k ≥ 5)", () => {
  const fan = (clubId: string, won = 3) => ({ clubId, played: 5, won, drawn: 1 });
  it("no muestra nada con menos de 5", () => {
    expect(summarizeCrowd([fan("u"), fan("u"), fan("u"), fan("u")])).toBeNull();
  });
  it("agrupa clubes chicos y oculta efectividad con pocos veredictos", () => {
    const s = summarizeCrowd([...Array(5).fill(0).map(() => fan("u")), fan("c"), fan("c")])!;
    expect(s.fans).toBe(7);
    expect(s.clubs.map((c) => c.clubId)).toEqual(["u"]);
    expect(s.others?.fans).toBe(2);
    expect(s.clubs[0].effectiveness).toBeCloseTo(((3 * 3 + 1) / 15) * 100);
  });
});
