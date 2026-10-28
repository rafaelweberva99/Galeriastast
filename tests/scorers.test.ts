import { describe, expect, it } from "vitest";
import { goalsComplete, scorersLine, scorersSeen } from "../src/lib/domain/scorers.ts";
import type { Goal } from "../src/lib/domain/types.ts";
import { match } from "./fixtures.ts";

const CC = "colo-colo";
const U = "universidad-de-chile";
const g = (matchId: string, teamId: string, player: string, minute: number | null, extra: Partial<Goal> = {}): Goal => ({
  matchId,
  teamId,
  player,
  minute,
  ownGoal: false,
  penalty: false,
  ...extra,
});

describe("scorersSeen", () => {
  const m1 = match({ id: "m1", homeTeamId: CC, awayTeamId: U, homeGoals: 3, awayGoals: 1 });
  const m2 = match({ id: "m2", homeTeamId: U, awayTeamId: CC, homeGoals: 2, awayGoals: 1 });
  const m3 = match({ id: "m3", homeTeamId: CC, awayTeamId: "everton", homeGoals: 1, awayGoals: 0 }); // goles incompletos
  const goals = new Map<string, Goal[]>([
    [
      "m1",
      [
        g("m1", CC, "Paredes", 10),
        g("m1", CC, "Paredes", 30, { penalty: true }),
        g("m1", CC, "Pérez", 55, { ownGoal: true }), // autogol de un jugador de la U a favor de Colo-Colo
        g("m1", U, "Vargas", 80),
      ],
    ],
    ["m2", [g("m2", U, "Vargas", 5), g("m2", U, "Vargas", 60), g("m2", CC, "Paredes", 90)]],
    ["m3", []],
  ]);

  it("cuenta ídolos, verdugos y autogoles solo en partidos con goles completos", () => {
    const r = scorersSeen([m1, m2, m3], goals, CC);
    expect(r.matchesPlayed).toBe(3);
    expect(r.matchesWithGoals).toBe(2);
    expect(r.goalsFor).toBe(4);
    expect(r.goalsAgainst).toBe(3);
    expect(r.idols[0]).toMatchObject({ player: "Paredes", goals: 3, penalties: 1, matches: 2, hatTricks: 0 });
    expect(r.executioners[0]).toMatchObject({ player: "Vargas", teamId: U, goals: 3, matches: 2 });
    expect(r.ownGoals).toHaveLength(1);
    expect(r.ownGoals[0]).toMatchObject({ inFavor: true, goal: { player: "Pérez" } });
    // el autogol no suma al ranking de goleadores
    expect(r.idols.find((s) => s.player === "Pérez")).toBeUndefined();
  });

  it("detecta listas de goles que no cuadran con el marcador", () => {
    expect(goalsComplete(m1, goals.get("m1")!)).toBe(true);
    expect(goalsComplete(m3, [])).toBe(false);
  });

  it("arma la línea de goleadores marcando penales y autogoles", () => {
    expect(scorersLine(goals.get("m1")!, CC)).toBe("Paredes 10', 30' (p) · Pérez (autogol) 55'");
    expect(scorersLine(goals.get("m1")!, U)).toBe("Vargas 80'");
  });
});
