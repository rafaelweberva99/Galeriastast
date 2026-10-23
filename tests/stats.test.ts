import { describe, expect, it } from "vitest";
import { buildCarnet, decidedOutcome, effectiveness, outcomeFor, recordFor, streaks, verdict } from "../src/lib/domain/stats.ts";
import { attended, match } from "./fixtures.ts";

const CC = "colo-colo";
const U = "universidad-de-chile";

describe("outcomeFor", () => {
  it("evalúa desde la óptica del club, de local o de visita", () => {
    expect(outcomeFor(match({ homeTeamId: CC, awayTeamId: U, homeGoals: 2, awayGoals: 1 }), CC)).toBe("G");
    expect(outcomeFor(match({ homeTeamId: CC, awayTeamId: U, homeGoals: 2, awayGoals: 1 }), U)).toBe("P");
    expect(outcomeFor(match({ homeTeamId: U, awayTeamId: CC, homeGoals: 1, awayGoals: 1 }), CC)).toBe("E");
  });

  it("ignora partidos sin resultado o de otros equipos", () => {
    expect(outcomeFor(match({ homeTeamId: CC, awayTeamId: U, homeGoals: null, awayGoals: null }), CC)).toBeNull();
    expect(outcomeFor(match({ homeTeamId: "everton", awayTeamId: U }), CC)).toBeNull();
  });

  it("los penales cuentan como empate para la efectividad pero definen la final", () => {
    const final = match({ homeTeamId: CC, awayTeamId: U, homeGoals: 1, awayGoals: 1, homePens: 4, awayPens: 2 });
    expect(outcomeFor(final, CC)).toBe("E");
    expect(decidedOutcome(final, CC)).toBe("G");
    expect(decidedOutcome(final, U)).toBe("P");
  });
});

describe("Mufómetro", () => {
  it("efectividad = puntos / puntos en disputa", () => {
    const ms = [
      match({ homeTeamId: CC, awayTeamId: U, homeGoals: 1, awayGoals: 0 }),
      match({ homeTeamId: CC, awayTeamId: U, homeGoals: 0, awayGoals: 0 }),
      match({ homeTeamId: CC, awayTeamId: U, homeGoals: 0, awayGoals: 1 }),
    ];
    const r = recordFor(ms, CC);
    expect(r).toMatchObject({ played: 3, won: 1, drawn: 1, lost: 1, goalsFor: 1, goalsAgainst: 1 });
    expect(effectiveness(r)).toBeCloseTo((4 / 9) * 100);
  });

  it("exige un mínimo de partidos y aplica los umbrales 60/40", () => {
    const rec = (won: number, drawn: number, lost: number) => ({
      played: won + drawn + lost, won, drawn, lost, goalsFor: 0, goalsAgainst: 0,
    });
    expect(verdict(rec(3, 0, 0)).key).toBe("sin-datos");
    expect(verdict(rec(5, 0, 0)).key).toBe("cabala-absoluta");
    expect(verdict(rec(3, 1, 1)).key).toBe("cabala"); // 66.7%
    expect(verdict(rec(2, 1, 2)).key).toBe("neutral"); // 46.7%
    expect(verdict(rec(1, 1, 3)).key).toBe("yeta"); // 26.7%
    expect(verdict(rec(0, 1, 4)).key).toBe("yeta-total"); // 6.7%
  });
});

describe("streaks", () => {
  it("calcula rachas en orden cronológico", () => {
    const g = (date: string, hg: number, ag: number) => match({ date, homeTeamId: CC, awayTeamId: U, homeGoals: hg, awayGoals: ag });
    const s = streaks([g("2024-01-05", 0, 1), g("2024-01-01", 1, 0), g("2024-01-02", 2, 0), g("2024-01-03", 1, 1), g("2024-01-04", 3, 0)], CC);
    expect(s.longestWin).toBe(2);
    expect(s.longestUnbeaten).toBe(4);
    expect(s.current).toEqual({ outcome: "P", length: 1 });
  });
});

describe("buildCarnet", () => {
  it("separa infiltrado, clásicos, finales e impacto contra la base del club", () => {
    const superclasico = match({ date: "2024-03-01", homeTeamId: U, awayTeamId: CC, homeGoals: 0, awayGoals: 2 });
    const final = match({ date: "2024-12-01", homeTeamId: CC, awayTeamId: "everton", homeGoals: 0, awayGoals: 0, homePens: 5, awayPens: 4, isFinal: true });
    const derrota = match({ date: "2024-05-01", homeTeamId: CC, awayTeamId: "palestino", homeGoals: 0, awayGoals: 3 });
    const noFue = match({ date: "2024-06-01", homeTeamId: CC, awayTeamId: "cobreloa", homeGoals: 0, awayGoals: 1 });

    const c = buildCarnet(
      [attended(superclasico, "infiltrado"), attended(final), attended(derrota)],
      CC,
      [{ id: "superclasico", name: "Superclásico", teamA: CC, teamB: U }],
      [superclasico, final, derrota, noFue],
    );

    expect(c.total).toBe(3);
    expect(c.record).toMatchObject({ won: 1, drawn: 1, lost: 1 });
    expect(c.infiltrado.played).toBe(1);
    expect(c.classics[0].record.won).toBe(1);
    expect(c.finals).toHaveLength(1);
    expect(c.finals[0].outcome).toBe("G");
    expect(c.biggestWin?.id).toBe(superclasico.id);
    expect(c.worstDefeat?.id).toBe(derrota.id);
    expect(c.baselineEffectiveness).toBeCloseTo((4 / 12) * 100);
    expect(c.impact).toBeCloseTo((4 / 9) * 100 - (4 / 12) * 100);
    expect(c.away.won).toBe(1);
  });
});
