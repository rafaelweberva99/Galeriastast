import { describe, expect, it } from "vitest";
import { goalsComplete, scorersLine, scorersSeen, tiedWithFirst } from "../src/lib/domain/scorers.ts";
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

  it("no cuenta como dato un partido sin lista de goles cargada", () => {
    const empate = match({ id: "m4", homeTeamId: CC, awayTeamId: U, homeGoals: 0, awayGoals: 0 });
    expect(scorersSeen([empate], new Map(), CC).matchesWithGoals).toBe(0);
    expect(scorersSeen([empate], new Map([["m4", []]]), CC).matchesWithGoals).toBe(1);
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

describe("verdugo e ídolo: desempate con sentido (no por orden alfabético)", () => {
  // Cuatro rivales con 2 goles en un partido cada uno; solo uno fue en una derrota del club.
  const mk = (id: string, date: string, ownGoals: number, rivalGoals: number, scorer: string) =>
    ({ m: match({ id, date, homeTeamId: U, awayTeamId: "rival", homeGoals: ownGoals, awayGoals: rivalGoals }), scorer, rivalGoals, ownGoals });
  const games = [
    mk("a", "2020-05-01", 2, 2, "Aarón Empate"), // 2-2: sus goles no fueron en derrota
    mk("b", "2022-05-01", 0, 2, "Zacarías Derrota"), // 0-2: derrota
    mk("c", "2021-05-01", 1, 2, "Bruno Derrota"), // 1-2: derrota, pero más antigua que la de Zacarías
    mk("d", "2023-05-01", 3, 2, "Carlos Victoria"), // 3-2: ganó
  ];
  const goals = new Map<string, Goal[]>();
  for (const { m, scorer, rivalGoals, ownGoals } of games) {
    goals.set(m.id, [
      ...Array.from({ length: ownGoals }, (_, i) => g(m.id, U, "Local " + (i + 1), 10 + i)),
      ...Array.from({ length: rivalGoals }, (_, i) => g(m.id, "rival", scorer, 20 + i)),
    ]);
  }
  const r = scorersSeen(games.map((x) => x.m), goals, U);

  it("el verdugo es quien marcó en derrotas, y entre ellos el más reciente (no el primero del abecedario)", () => {
    expect(r.executioners.map((e) => e.player)).toEqual(["Zacarías Derrota", "Bruno Derrota", "Carlos Victoria", "Aarón Empate"]);
    expect(r.executioners[0].player).toBe("Zacarías Derrota");
    expect(r.executioners[0].decisive).toBe(2);
  });

  it("avisa cuántos jugadores empatan con el primero", () => {
    // Zacarías y Bruno: 2 goles, 0 hat-tricks, 2 decisivos, 1 partido → empatan.
    expect(tiedWithFirst(r.executioners)).toBe(1);
  });
});
