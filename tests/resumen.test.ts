import { describe, expect, it } from "vitest";
import { buildResumen, pickTitle, yearsWithMatches } from "../src/lib/domain/resumen.ts";
import type { Goal } from "../src/lib/domain/types.ts";
import { match } from "./fixtures.ts";

const U = "u";
const g = (matchId: string, teamId: string, player: string): Goal => ({ matchId, teamId, player, minute: 10, ownGoal: false, penalty: false });
const home = (date: string, hg: number, ag: number, rival = "r1", extra = {}) =>
  match({ homeTeamId: U, awayTeamId: rival, awayTeamName: rival, homeTeamName: "U", date, homeGoals: hg, awayGoals: ag, ...extra });
const away = (date: string, hg: number, ag: number, rival = "r1", extra = {}) =>
  match({ homeTeamId: rival, awayTeamId: U, homeTeamName: rival, awayTeamName: "U", date, homeGoals: hg, awayGoals: ag, ...extra });

const run = (attended: ReturnType<typeof home>[], clubMatches = attended, goals = new Map<string, Goal[]>(), rivalries = []) =>
  buildResumen({ year: 2024, clubId: U, attended, goals, clubMatches, rivalries });

describe("resumen anual", () => {
  it("año sin partidos: todo vacío y sin romper", () => {
    const r = run([]);
    expect(r.played).toBe(0);
    expect(r.effectiveness).toBeNull();
    expect(r.matchOfYear).toBeNull();
    expect(r.bestWin).toBeNull();
    expect(r.busiestMonth).toBeNull();
    expect(r.streak).toBeNull();
    expect(r.title.key).toBe("de-paso");
  });

  it("un solo partido es el partido del año, el primero y el último", () => {
    const m = home("2024-03-10", 2, 0);
    const r = run([m]);
    expect(r.played).toBe(1);
    expect(r.matchOfYear?.match.id).toBe(m.id);
    expect(r.matchOfYear?.reason).toBe("unico");
    expect(r.first?.match.id).toBe(r.last?.match.id);
    expect(r.streak).toEqual({ kind: "unbeaten", length: 1 });
  });

  it("ignora otros años, partidos sin jugar y de otros clubes", () => {
    const ok = home("2024-03-10", 1, 0);
    const r = run([ok, home("2023-03-10", 1, 0), home("2024-04-10", null as never, null as never), match({ homeTeamId: "x", awayTeamId: "y", date: "2024-05-01", homeGoals: 1, awayGoals: 0 })]);
    expect(r.played).toBe(1);
  });

  it("balance, efectividad y delta contra el club", () => {
    const a = [home("2024-02-01", 2, 0), home("2024-02-08", 1, 1), away("2024-02-15", 3, 0)];
    const club = [...a, home("2024-03-01", 0, 1), home("2024-03-08", 0, 1), home("2024-03-15", 1, 0)];
    const r = run(a, club);
    expect(r.record).toMatchObject({ won: 1, drawn: 1, lost: 1 });
    expect(r.effectiveness).toBeCloseTo((4 / 9) * 100);
    expect(r.clubEffectiveness).toBeCloseTo((7 / 18) * 100);
    expect(r.deltaVsClub).toBeCloseTo((4 / 9 - 7 / 18) * 100);
  });

  it("mejor victoria, peor derrota y partido del año", () => {
    const w1 = home("2024-02-01", 2, 0);
    const w2 = away("2024-02-08", 0, 4);
    const l1 = home("2024-02-15", 0, 1);
    const l2 = away("2024-02-22", 3, 0);
    const r = run([w1, w2, l1, l2]);
    expect(r.bestWin?.match.id).toBe(w2.id);
    expect(r.bestWin?.margin).toBe(4);
    expect(r.worstLoss?.match.id).toBe(l2.id);
    expect(r.matchOfYear?.match.id).toBe(w2.id);
    expect(r.matchOfYear?.reason).toBe("goleada");
  });

  it("una final o un clásico pesan más que los goles", () => {
    const final = home("2024-12-01", 1, 0, "r1", { isFinal: true });
    const goleada = home("2024-05-01", 4, 3);
    expect(run([final, goleada]).matchOfYear).toMatchObject({ reason: "final" });
    const clasico = home("2024-06-01", 0, 0, "rc");
    expect(run([clasico, home("2024-05-01", 2, 0)], undefined, undefined, [{ id: "c", name: "Clásico", teamA: U, teamB: "rc" }] as never).matchOfYear).toMatchObject({
      reason: "clasico",
    });
  });

  it("estadio del año: el más visto, con cuántos estadios distintos pisó", () => {
    expect(run([home("2024-03-01", 1, 0)]).topVenue).toBeNull();
    const r = run([
      home("2024-03-01", 1, 0, "a", { venueName: "Estadio A" }),
      home("2024-04-01", 1, 0, "b", { venueName: "Estadio B" }),
      home("2024-05-01", 1, 0, "c", { venueName: "Estadio B" }),
      home("2024-06-01", 1, 0, "d", { venueName: null }),
    ]);
    expect(r.topVenue).toEqual({ name: "Estadio B", count: 2, distinct: 2 });
  });

  it("mes con más partidos (empate: el más temprano) y rival más visto", () => {
    const r = run([home("2024-03-01", 1, 0, "a"), home("2024-03-08", 1, 0, "b"), home("2024-05-01", 1, 0, "a"), home("2024-05-08", 1, 0, "a")]);
    expect(r.busiestMonth).toMatchObject({ month: 3, name: "marzo", count: 2 });
    expect(r.topRival).toMatchObject({ teamId: "a", count: 3 });
  });

  it("rachas del año", () => {
    const r = run([
      home("2024-01-01", 1, 0),
      home("2024-01-08", 1, 0),
      home("2024-01-15", 1, 1),
      home("2024-01-22", 0, 1),
      home("2024-01-29", 0, 1),
      home("2024-02-05", 2, 0),
    ]);
    expect(r.longestWin).toBe(2);
    expect(r.longestUnbeaten).toBe(3);
    expect(r.longestWinless).toBe(3);
    expect(r.streak).toEqual({ kind: "wins", length: 2 });
    expect(r.sequence).toEqual(["G", "G", "E", "P", "P", "G"]);
  });

  it("ídolo, verdugo y goles vistos con el desempate de scorers.ts", () => {
    const m1 = home("2024-02-01", 2, 1);
    const m2 = home("2024-02-08", 1, 2);
    const goals = new Map<string, Goal[]>([
      [m1.id, [g(m1.id, U, "Pérez"), g(m1.id, U, "Soto"), g(m1.id, "r1", "Rojo")]],
      [m2.id, [g(m2.id, U, "Soto"), g(m2.id, "r1", "Rojo"), g(m2.id, "r1", "Rojo")]],
    ]);
    const r = run([m1, m2], undefined, goals);
    expect(r.idol?.player).toBe("Soto");
    expect(r.idol?.goals).toBe(2);
    expect(r.executioner?.player).toBe("Rojo");
    expect(r.executioner?.goals).toBe(3);
    expect(r.goalsSeenFor).toBe(3);
    expect(r.goalsSeenAgainst).toBe(3);
  });

  it("sin goleadores cargados no hay ídolo ni verdugo", () => {
    const r = run([home("2024-02-01", 2, 1)]);
    expect(r.idol).toBeNull();
    expect(r.executioner).toBeNull();
    expect(r.matchesWithGoals).toBe(0);
  });

  it("comparación con el año anterior", () => {
    const prev = [home("2023-02-01", 0, 1), home("2023-02-08", 0, 1)];
    const cur = [home("2024-02-01", 1, 0), home("2024-02-08", 1, 0), home("2024-02-15", 1, 0)];
    const r = run([...prev, ...cur]);
    expect(r.previous).toMatchObject({ year: 2023, played: 2, deltaPlayed: 1, effectiveness: 0 });
    expect(r.previous?.deltaEffectiveness).toBeCloseTo(100);
    expect(run(cur).previous).toBeNull();
  });

  it("años disponibles, de reciente a antiguo, solo con partidos jugados del club", () => {
    expect(yearsWithMatches([home("2019-01-01", 1, 0), home("2024-01-01", 1, 0), home("2019-05-01", 0, 0)], U)).toEqual([2024, 2019]);
  });
});

describe("apodo del año", () => {
  const base = { year: 2025, played: 10, effectiveness: 50, wonFinal: false, longestUnbeaten: 2, goalsPerGame: 2, matchesWithGoals: 8 };
  it("pocos partidos", () => {
    expect(pickTitle({ ...base, played: 2 }).key).toBe("de-paso");
    expect(pickTitle({ ...base, played: 4, effectiveness: 90 }).key).toBe("ocasional");
  });
  it("cábala, sufridor, invicto, goleador, fiel y parejo", () => {
    expect(pickTitle({ ...base, effectiveness: 75 })).toMatchObject({ key: "cabala", label: "El Cábala del 2025" });
    expect(pickTitle({ ...base, effectiveness: 20 }).key).toBe("sufridor");
    expect(pickTitle({ ...base, longestUnbeaten: 7 }).key).toBe("invicto");
    expect(pickTitle({ ...base, goalsPerGame: 4 }).key).toBe("goleador");
    expect(pickTitle({ ...base, played: 18 }).key).toBe("fiel");
    expect(pickTitle(base).key).toBe("parejo");
  });
  it("ganar una final manda sobre el resto", () => {
    expect(pickTitle({ ...base, wonFinal: true, effectiveness: 80 }).key).toBe("testigo-de-gloria");
  });
});
