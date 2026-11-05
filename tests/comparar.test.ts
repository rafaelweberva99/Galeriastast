import { describe, expect, it } from "vitest";
import { commonMatches, duelRows, duelVerdict, headline, normalizeHandle, pickWinner, type FanSide } from "../src/lib/domain/comparar.ts";
import { match } from "./fixtures.ts";

function fan(p: Partial<FanSide> & { username: string }): FanSide {
  return {
    memberId: 1, clubId: "u", clubName: "U. de Chile", clubShort: "U", total: 20, played: 20, won: 10, drawn: 5, lost: 5,
    goalsFor: 30, goalsAgainst: 20, effectiveness: 58, tierLabel: "Socio", verdictLabel: "Hincha neutro", verdictKey: "neutral",
    longestUnbeaten: 5, bestSeason: null, finals: 0, classics: 2, seasons: 3, sinceYear: 2015, idol: null, executioner: null, ...p,
  };
}

describe("pickWinner", () => {
  it("alto, bajo, empate y nulos", () => {
    expect(pickWinner(3, 2, "alto")).toBe("a");
    expect(pickWinner(2015, 2018, "bajo")).toBe("a");
    expect(pickWinner(1, 1, "alto")).toBe("empate");
    expect(pickWinner(null, 1, "alto")).toBeNull();
    expect(pickWinner(5, 1, null)).toBeNull();
  });
});

describe("headline y filas", () => {
  it("nombra al ganador y la diferencia", () => {
    expect(headline(fan({ username: "a", effectiveness: 50 }), fan({ username: "b", effectiveness: 62 }))).toBe("Gana @b por 12 puntos de efectividad");
  });
  it("empate y sin datos", () => {
    expect(headline(fan({ username: "a", effectiveness: 50 }), fan({ username: "b", effectiveness: 50.2 }))).toContain("Empate");
    expect(headline(fan({ username: "a", effectiveness: null }), fan({ username: "b" }))).toContain("falta");
  });
  it("antigüedad: gana el más antiguo; goles en contra sin ganador", () => {
    const rows = duelRows(fan({ username: "a", sinceYear: 2010 }), fan({ username: "b", sinceYear: 2016 }));
    expect(rows.find((r) => r.key === "since")!.winner).toBe("a");
    expect(rows.find((r) => r.key === "gc")!.winner).toBeNull();
  });
});

describe("duelVerdict", () => {
  const v = (a: Partial<FanSide>, b: Partial<FanSide>) => duelVerdict(fan({ username: "a", ...a }), fan({ username: "b", ...b }));
  it("sin datos y pocos datos", () => {
    expect(v({ played: 0, effectiveness: null }, {}).key).toBe("sin-datos");
    expect(v({ played: 3 }, {}).key).toBe("pocos-datos");
  });
  it("empate técnico", () => expect(v({ effectiveness: 55 }, { effectiveness: 56 }).key).toBe("empate-tecnico"));
  it("escalas", () => {
    expect(v({ effectiveness: 80 }, { effectiveness: 40 })).toMatchObject({ key: "aplastante", winner: "a" });
    expect(v({ effectiveness: 40 }, { effectiveness: 55 })).toMatchObject({ key: "ventaja-clara", winner: "b" });
    expect(v({ effectiveness: 50 }, { effectiveness: 55 }).key).toBe("gana-por-poco");
  });
  it("más cábala vs más fiel", () => {
    const r = v({ effectiveness: 70, total: 10, played: 10 }, { effectiveness: 52, total: 60, played: 60 });
    expect(r.key).toBe("cabala-vs-fiel");
    expect(r.winner).toBeNull();
  });
});

describe("commonMatches", () => {
  const m1 = match({ homeTeamId: "u", awayTeamId: "x", homeGoals: 3, awayGoals: 0, date: "2024-03-01" });
  const m2 = match({ homeTeamId: "x", awayTeamId: "u", homeGoals: 2, awayGoals: 0, date: "2024-04-01" });
  const m3 = match({ homeTeamId: "u", awayTeamId: "x", homeGoals: 1, awayGoals: 1, date: "2024-05-01" });
  it("mismo club: mejor y peor noche", () => {
    const c = commonMatches([m1, m2, m3], [m1, m2], "u", "u");
    expect(c.count).toBe(2);
    expect(c.best!.match.id).toBe(m1.id);
    expect(c.worst!.match.id).toBe(m2.id);
    expect(c.headToHead).toBeNull();
  });
  it("sin partidos en común", () => {
    const c = commonMatches([m1], [m2], "u", "u");
    expect(c.count).toBe(0);
    expect(c.best).toBeNull();
  });
  it("clubes distintos: cara a cara", () => {
    const clasico = match({ homeTeamId: "u", awayTeamId: "colo", homeGoals: 2, awayGoals: 1 });
    const c = commonMatches([clasico], [clasico], "u", "colo");
    expect(c.headToHead).toEqual({ a: 1, b: 0, draws: 0 });
    expect(c.best).toBeNull();
    expect(c.biggest!.match.id).toBe(clasico.id);
  });
});

it("normalizeHandle", () => expect(normalizeHandle("  @@Pancho ")).toBe("Pancho"));
