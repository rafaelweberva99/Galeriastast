import { describe, expect, it } from "vitest";
import { buildInsights } from "../src/lib/domain/insights/index.ts";
import { phaseOf } from "../src/lib/domain/insights/aggregate.ts";
import type { Match } from "../src/lib/domain/types.ts";
import { attended, match } from "./fixtures.ts";

const U = "u";
let k = 0;
/** Partido de U: `res` es "gf-gc"; `home` indica si juega de local. */
function g(date: string, res: string, rival = "colo", p: Partial<Match> = {}, home = true): Match {
  const [a, b] = res.split("-").map(Number);
  k++;
  return match({
    id: `t${k}`,
    date,
    season: Number(date.slice(0, 4)),
    homeTeamId: home ? U : rival,
    awayTeamId: home ? rival : U,
    homeTeamName: home ? "La U" : rival,
    awayTeamName: home ? rival : "La U",
    homeGoals: home ? a : b,
    awayGoals: home ? b : a,
    ...p,
  });
}
const run = (ms: Match[], all: Match[] = ms, opts?: { today?: string }) => buildInsights(ms.map((m) => attended(m)), all, U, opts);

describe("buildInsights: casos borde", () => {
  it("0 partidos", () => {
    const i = run([]);
    expect(i.played).toBe(0);
    expect(i.seasons).toEqual([]);
    expect(i.form).toEqual([]);
    expect(i.missed).toBeNull();
    expect(i.highlights).toEqual([]);
    expect(i.records.longestWin).toBeNull();
    expect(i.goals.forPerMatch).toBe(0);
    expect(i.distributions.byMonth).toHaveLength(12);
    expect(i.distributions.byWeekday).toHaveLength(7);
  });

  it("1 partido: sin veredicto ni frases de muestra grande", () => {
    const i = run([g("2024-03-02", "2-1")]);
    expect(i.played).toBe(1);
    expect(i.rivals[0].verdict).toBe("poca-muestra");
    expect(i.form[0].rolling10).toBeNull();
    expect(i.records.bestSeason).toBeNull(); // mínimo 3 partidos
    expect(i.records.busiestSeason).toEqual({ season: 2024, pj: 1 });
    expect(i.highlights.some((h) => h.id.startsWith("rival-"))).toBe(false);
  });

  it("ignora suspendidos, partidos de otros clubes y duplicados", () => {
    const ok = g("2024-03-02", "1-0");
    const susp = g("2024-03-09", "1-0", "colo", { homeGoals: null, awayGoals: null });
    const ajeno = match({ homeTeamId: "a", awayTeamId: "b", homeGoals: 1, awayGoals: 0 });
    const i = buildInsights([attended(ok), attended(ok), attended(susp), attended(ajeno)], [ok, susp], U);
    expect(i.played).toBe(1);
  });

  it("solo derrotas", () => {
    const ms = [g("2024-03-01", "0-1"), g("2024-03-08", "0-2"), g("2024-03-15", "1-4"), g("2024-03-22", "0-1")];
    const i = run(ms);
    expect(i.seasons[0].effectiveness).toBe(0);
    expect(i.records.longestWin).toBeNull();
    expect(i.records.longestUnbeaten).toBeNull();
    expect(i.records.longestWinless?.length).toBe(4);
    expect(i.goals.bigLosses).toBe(1);
    expect(i.highlights.every((h) => h.text.trim().length > 0)).toBe(true);
  });

  it("temporada sin datos del club: delta null", () => {
    const m = g("2024-03-02", "2-0");
    const i = buildInsights([attended(m)], [], U);
    // el partido visto cuenta como dato del club, por lo que el delta es 0
    expect(i.seasons[0].delta).toBe(0);
  });

  it("respeta opts.today", () => {
    const ms = [g("2024-03-02", "1-0"), g("2030-01-01", "1-0")];
    expect(run(ms, ms, { today: "2025-01-01" }).played).toBe(1);
  });
});

describe("buildInsights: temporadas y forma", () => {
  it("compara con el club en toda la temporada", () => {
    const seen = [g("2024-03-01", "1-0"), g("2024-03-08", "2-0")];
    const unseen = [g("2024-04-01", "0-1"), g("2024-04-08", "0-0")];
    const i = run(seen, [...seen, ...unseen]);
    const s = i.seasons[0];
    expect(s.effectiveness).toBe(1);
    expect(s.clubEffectiveness).toBeCloseTo(7 / 12);
    expect(s.delta).toBeCloseTo((1 - 7 / 12) * 100);
  });

  it("curva: acumulada y móvil de 10", () => {
    const ms = Array.from({ length: 11 }, (_, n) => g(`2024-02-${String(n + 1).padStart(2, "0")}`, n === 0 ? "0-1" : "1-0"));
    const f = run(ms).form;
    expect(f).toHaveLength(11);
    expect(f[0].cumulative).toBe(0);
    expect(f[8].rolling10).toBeNull();
    expect(f[9].rolling10).toBeCloseTo(27 / 30);
    expect(f[10].rolling10).toBe(1);
    expect(f[10].label).toBe("La U 1-0 colo");
  });
});

describe("buildInsights: rivales", () => {
  const club = (rival: string, res: string[]) => res.map((r, n) => g(`2020-0${1 + (n % 9)}-1${n % 9}`, r, rival));
  it("yeta, cábala, neutro y poca muestra", () => {
    const seenYeta = club("colo", ["0-1", "0-2", "1-1"]);
    const seenCabala = club("wand", ["1-0", "2-0", "3-0"]);
    const seenNeutro = club("cat", ["1-0", "0-1", "1-1"]);
    const seenPoca = club("lig", ["0-1", "0-1"]);
    // el club en general: gana mucho a Colo-Colo y pierde mucho con Wanderers
    const bgColo = club("colo", ["1-0", "1-0", "1-0", "1-0", "1-0", "1-0"]);
    const bgWand = club("wand", ["0-1", "0-1", "0-1", "0-1", "0-1", "0-1"]);
    const seen = [...seenYeta, ...seenCabala, ...seenNeutro, ...seenPoca];
    const i = run(seen, [...seen, ...bgColo, ...bgWand]);
    const by = Object.fromEntries(i.rivals.map((r) => [r.rivalId, r]));
    expect(by.colo.verdict).toBe("yeta");
    expect(by.wand.verdict).toBe("cabala");
    expect(by.cat.verdict).toBe("neutro");
    expect(by.lig.verdict).toBe("poca-muestra");
    expect(by.colo.clubEffectiveness).toBeCloseTo((18 + 1) / 27);
    expect(i.rivals.map((r) => r.pj)).toEqual([...i.rivals.map((r) => r.pj)].sort((a, b) => b - a));
    const hl = i.highlights.find((h) => h.id === "rival-yeta-colo")!;
    expect(hl.text).toBe("Contra colo eres yeta: ninguna victoria en 3 partidos (el club rinde 70 % en general).");
  });
});

describe("buildInsights: competencias, fases, distribuciones y goles", () => {
  it("fases a partir de stage/isFinal", () => {
    const base = g("2024-01-01", "1-0");
    const ph = (p: Partial<Match>) => phaseOf({ ...base, ...p });
    expect(ph({ stage: "Fecha 20" })).toBe("liga");
    expect(ph({ stage: null })).toBe("liga");
    expect(ph({ stage: "Grupo A", competitionKind: "internacional" })).toBe("grupos");
    expect(ph({ stage: "Fase de grupos · Grupo F", competitionKind: "internacional" })).toBe("grupos");
    expect(ph({ stage: "Octavos de final · Ida", competitionKind: "copa" })).toBe("eliminatoria");
    expect(ph({ stage: "Semifinal", competitionKind: "copa" })).toBe("eliminatoria");
    expect(ph({ stage: "Final", isFinal: true, competitionKind: "copa" })).toBe("final");
    expect(ph({ stage: null, competitionKind: "copa" })).toBe("otro");
  });

  it("competencias con local/visita y fases", () => {
    const ms = [
      g("2024-03-01", "1-0"),
      g("2024-03-08", "0-0", "colo", {}, false),
      g("2024-04-01", "2-2", "colo", { competitionId: "copa-chile", competitionName: "Copa Chile", competitionKind: "copa", stage: "Final", isFinal: true }),
    ];
    const i = run(ms);
    expect(i.competitions.map((c) => c.competitionId)).toEqual(["primera-division", "copa-chile"]);
    expect(i.competitions[0].home.g).toBe(1);
    expect(i.competitions[0].away.e).toBe(1);
    expect(i.phases.map((p) => p.phase)).toEqual(["liga", "final"]);
  });

  it("distribuciones", () => {
    const i = run([g("2024-03-02", "1-0"), g("2024-03-09", "1-0"), g("2025-05-04", "1-0")]);
    expect(i.distributions.byMonth[2]).toBe(2);
    expect(i.distributions.byMonth[4]).toBe(1);
    expect(i.distributions.byWeekday[6]).toBe(2); // 2 y 9 de marzo de 2024 fueron sábado
    expect(i.distributions.byWeekday[0]).toBe(1); // 4 de mayo de 2025: domingo
    expect(i.distributions.bySeason).toEqual([{ season: 2024, pj: 2 }, { season: 2025, pj: 1 }]);
  });

  it("goles, vallas, goleadas y penales", () => {
    const ms = [
      g("2024-03-01", "0-0"),
      g("2024-03-08", "4-0"),
      g("2024-03-15", "1-4"),
      g("2024-03-22", "3-3", "colo", { homePens: 4, awayPens: 3 }),
      g("2024-03-29", "2-2", "colo", { homePens: 2, awayPens: 4 }),
    ];
    const gl = run(ms).goals;
    expect(gl.forPerMatch).toBeCloseTo(10 / 5);
    expect(gl.againstPerMatch).toBeCloseTo(9 / 5);
    expect(gl.goalless).toBe(1);
    expect(gl.cleanSheets).toBe(2);
    expect(gl.bigWins).toBe(1);
    expect(gl.bigLosses).toBe(1);
    expect(gl.highestScoring?.id).toBe(ms[3].id);
    expect(gl.shootouts).toEqual({ pj: 2, won: 1, lost: 1 });
  });
});

describe("buildInsights: lo que te perdiste", () => {
  it("compara contigo vs sin ti solo en tus temporadas", () => {
    const seen = [g("2024-03-01", "1-0"), g("2024-03-08", "1-0")];
    const unseen = [g("2024-04-01", "0-5"), g("2024-04-08", "6-0"), g("2024-12-01", "2-0", "colo", { isFinal: true, stage: "Final" })];
    const otherSeason = g("2019-04-01", "9-0");
    const i = run(seen, [...seen, ...unseen, otherSeason]);
    const m = i.missed!;
    expect(m.missed).toBe(3);
    expect(m.withYou.effectiveness).toBe(1);
    expect(m.without.pj).toBe(3);
    expect(m.biggestWinMissed?.id).toBe(unseen[1].id);
    expect(m.biggestLossMissed?.id).toBe(unseen[0].id);
    expect(m.finalsMissed.map((x) => x.id)).toEqual([unseen[2].id]);
  });
  it("null si no hubo partidos ausentes", () => {
    const seen = [g("2024-03-01", "1-0")];
    expect(run(seen).missed).toBeNull();
  });
  it("un partido marcado pero suspendido no cuenta como perdido", () => {
    const seen = g("2024-03-01", "1-0");
    const susp = g("2024-03-08", "0-0", "colo", { homeGoals: null, awayGoals: null });
    expect(buildInsights([attended(seen), attended(susp)], [seen, susp], U).missed).toBeNull();
  });
});

describe("buildInsights: récords", () => {
  it("rachas con fechas, temporadas seguidas y mejores/peores", () => {
    const ms = [
      g("2021-03-01", "1-0"), g("2021-03-08", "1-0"), g("2021-03-15", "1-0"), g("2021-03-22", "0-1"),
      g("2022-03-01", "0-1"), g("2022-03-08", "0-1"), g("2022-03-15", "1-1"),
      g("2023-03-01", "1-0"),
      g("2025-03-01", "1-0"), g("2025-03-08", "2-0"), g("2025-03-15", "1-1"),
    ];
    const r = run(ms).records;
    expect(r.longestWin).toEqual({ length: 3, from: "2021-03-01", to: "2021-03-15" });
    expect(r.longestUnbeaten).toEqual({ length: 5, from: "2022-03-15", to: "2025-03-15" });
    expect(r.longestWinless).toEqual({ length: 4, from: "2021-03-22", to: "2022-03-15" });
    expect(r.seasonsInARow).toBe(3);
    expect(r.bestSeason?.season).toBe(2025);
    expect(r.worstSeason?.season).toBe(2022);
    expect(r.busiestSeason).toEqual({ season: 2021, pj: 4 });
  });
  it("mejor y peor no repiten la misma temporada", () => {
    const ms = [g("2024-03-01", "1-0"), g("2024-03-08", "1-0"), g("2024-03-15", "1-0")];
    const r = run(ms).records;
    expect(r.bestSeason?.season).toBe(2024);
    expect(r.worstSeason).toBeNull();
  });
});

describe("buildInsights: highlights", () => {
  const long = Array.from({ length: 12 }, (_, n) => g(`2024-0${1 + (n % 9)}-${10 + n}`, n < 6 ? "2-0" : "0-0", n % 2 ? "colo" : "wand"));
  it("ordenadas por weight, sin ids repetidos, máximo 10 y con plural correcto", () => {
    const hs = run(long).highlights;
    expect(hs.length).toBeGreaterThan(0);
    expect(hs.length).toBeLessThanOrEqual(10);
    expect(new Set(hs.map((h) => h.id)).size).toBe(hs.length);
    for (let n = 1; n < hs.length; n++) expect(hs[n - 1].weight).toBeGreaterThanOrEqual(hs[n].weight);
    for (const h of hs) {
      expect(h.text).not.toMatch(/undefined|NaN|null|1 victorias|1 partidos|1 finales/);
      expect(h.weight).toBeGreaterThanOrEqual(0);
      expect(h.weight).toBeLessThanOrEqual(100);
    }
  });
  it("es determinista", () => {
    expect(run(long)).toEqual(run(long));
  });
  it("racha invicta con rango de fechas", () => {
    const ms = Array.from({ length: 6 }, (_, n) => g(`2017-0${3 + n}-10`, "1-0"));
    const h = run(ms).highlights.find((x) => x.id === "racha-invicta")!;
    expect(h.text).toBe("6 partidos seguidos sin perder: tu racha más larga fue entre mar y ago de 2017.");
    expect(h.matchIds).toHaveLength(6);
  });
});
