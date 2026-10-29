import { describe, expect, it } from "vitest";
import { computeAchievements, nextTier, tierFor } from "../src/lib/domain/achievements.ts";
import type { Match } from "../src/lib/domain/types.ts";

const m = (id: string, date: string, competitionId = "primera-division"): Match => ({
  id, date, season: Number(date.slice(0, 4)), competitionId, competitionName: "", competitionKind: "liga", tournament: null, stage: null,
  homeTeamId: "colo-colo", homeTeamName: "Colo-Colo", awayTeamId: "x", awayTeamName: "X", homeGoals: 1, awayGoals: 0,
  homePens: null, awayPens: null, venueName: null, isFinal: false,
});

describe("niveles del carnet", () => {
  it("Socio, Bronce 25, Plata 50, Oro 100, Leyenda 200", () => {
    expect([0, 24, 25, 49, 50, 99, 100, 199, 200, 350].map((n) => tierFor(n).key)).toEqual([
      "socio", "socio", "bronce", "bronce", "plata", "plata", "oro", "oro", "leyenda", "leyenda",
    ]);
    expect(nextTier(75)?.key).toBe("oro");
    expect(nextTier(200)).toBeNull();
  });
});

describe("premios", () => {
  const club = [m("a", "2024-03-01"), m("b", "2024-04-01"), m("c", "2024-05-01", "copa-chile"), m("d", "2025-03-01"), m("e", "2026-11-30")];
  it("una rueda completa a los 32 partidos", () => {
    expect(computeAchievements(31, new Set(), club, "2026-10-29").rueda).toEqual({ done: false, missing: 1 });
    expect(computeAchievements(32, new Set(), club, "2026-10-29").rueda.done).toBe(true);
  });
  it("temporada perfecta de liga y total; la temporada en curso no cuenta", () => {
    const liga = computeAchievements(3, new Set(["a", "b", "d"]), club, "2026-10-29");
    expect(liga.perfectLeague.map((s) => s.season)).toEqual([2025, 2024]);
    expect(liga.perfectTotal.map((s) => s.season)).toEqual([2025]);
    const todo = computeAchievements(4, new Set(["a", "b", "c", "e"]), club, "2026-10-29");
    expect(todo.perfectTotal.map((s) => s.season)).toEqual([2024]);
    expect(todo.perfectLeague.map((s) => s.season)).toEqual([2024]);
  });
  it("si no logró ninguna, muestra la temporada más cercana", () => {
    const a = computeAchievements(1, new Set(["a"]), club, "2026-10-29");
    expect(a.perfectLeague).toEqual([]);
    expect(a.closest).toEqual({ season: 2024, attended: 1, matches: 2 });
  });
});
