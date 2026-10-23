import { describe, expect, it } from "vitest";
import { inferDate, isFinalRound, parseFootballTxt, parseScore, roundToSpanish } from "../src/lib/ingest/footballtxt.ts";

describe("parseScore", () => {
  it.each([
    ["4-1", { homeGoals: 4, awayGoals: 1, homePens: null, extraTime: false }],
    ["9-1 (5-0)", { homeGoals: 9, awayGoals: 1 }],
    ["2-1 a.e.t. (1-1, 0-0)", { homeGoals: 2, awayGoals: 1, extraTime: true }],
    ["4-2 pen. (1-1, 0-0)", { homeGoals: 1, awayGoals: 1, homePens: 4, awayPens: 2 }],
    ["4-5 pen. 0-1 a.e.t. (0-1, 0-0)", { homeGoals: 0, awayGoals: 1, homePens: 4, awayPens: 5, extraTime: true }],
    ["2-4 pen.", { homeGoals: null, awayGoals: null, homePens: 2, awayPens: 4 }],
  ])("%s", (raw, expected) => {
    expect(parseScore(raw)).toMatchObject(expected);
  });

  it("rechaza marcadores desconocidos", () => {
    expect(parseScore("-")).toBeNull();
    expect(parseScore("abd.")).toBeNull();
  });
});

describe("inferDate", () => {
  const range = { start: "2020-01-24", end: "2021-02-15" };
  it("usa el año correcto en temporadas que cruzan el año calendario", () => {
    expect(inferDate(1, 31, range, "2020-01-24")).toBe("2020-01-31");
    expect(inferDate(1, 31, range, "2021-01-20")).toBe("2021-01-31");
    expect(inferDate(7, 26, { start: "2013-07-26", end: "2014-05-11" }, null)).toBe("2013-07-26");
    expect(inferDate(3, 1, { start: "2013-07-26", end: "2014-05-11" }, null)).toBe("2014-03-01");
  });
});

describe("parseFootballTxt", () => {
  const sample = `= CL 1 2005

# Date       Fri Jan/21 - Thu Dec/22 2005 (335d)

== Apertura

Matchday 1
[Fri Jan/21]
  17.00  Huachipato               4-1  La Serena
         Universidad de Concepción  3-0  Audax Italiano
[Sat Jan/22]
  21.00  Everton                  3-2  Universidad de Chile
         Colo-Colo                -  Puerto Montt              [postponed]
  18.30  Universidad Católica     3-0  Unión Española           [awarded]

== Apertura Playoffs

Final
[Sun Jun/26]
  16.00  Universidad Católica     4-2 pen. (1-1, 0-0)  Universidad de Chile
`;

  it("lee fases, jornadas, fechas, resultados y anotaciones", () => {
    const r = parseFootballTxt(sample);
    expect(r.warnings).toEqual([]);
    expect(r.skipped).toBe(1);
    expect(r.matches).toHaveLength(5);
    expect(r.matches[1]).toMatchObject({ date: "2005-01-21", home: "Universidad de Concepción", away: "Audax Italiano", homeGoals: 3 });
    expect(r.matches[3]).toMatchObject({ awarded: true });
    expect(r.matches[4]).toMatchObject({ stage: "Apertura Playoffs", round: "Final", homePens: 4, awayPens: 2, date: "2005-06-26" });
  });

  it("identifica finales y traduce rondas", () => {
    expect(isFinalRound("Apertura Playoffs", "Final")).toBe(true);
    expect(isFinalRound("Apertura Final", null)).toBe(true);
    expect(isFinalRound("Apertura Playoffs", "Semifinals")).toBe(false);
    expect(isFinalRound("Ap. Playoff Libert.", "Final")).toBe(false);
    expect(isFinalRound("Copa Sud Playoffs", "Final")).toBe(false);
    expect(roundToSpanish("Matchday 12")).toBe("Fecha 12");
    expect(roundToSpanish("Quarterfinals")).toBe("Cuartos de final");
  });
});
