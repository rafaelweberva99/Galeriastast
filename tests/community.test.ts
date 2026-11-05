import { describe, expect, it } from "vitest";
import {
  fanEffectiveness,
  fansMissing,
  MIN_COMMUNITY_FANS,
  percentileRank,
  privacyGate,
  rankDesc,
  verdictShares,
} from "../src/lib/domain/community.ts";

describe("privacidad", () => {
  it("oculta cifras con menos de 5 hinchas", () => {
    expect(MIN_COMMUNITY_FANS).toBe(5);
    expect(privacyGate(4, 42)).toBeNull();
    expect(privacyGate(5, 42)).toBe(42);
    expect(privacyGate(0, 0)).toBeNull();
    expect(fansMissing(2)).toBe(3);
    expect(fansMissing(9)).toBe(0);
  });
});

describe("percentileRank", () => {
  it("cuenta menores y la mitad de los empates", () => {
    expect(percentileRank(10, [1, 2, 3, 4])).toBe(100);
    expect(percentileRank(0, [1, 2, 3, 4])).toBe(0);
    expect(percentileRank(3, [1, 2, 3, 4])).toBe(62.5);
    expect(percentileRank(5, [5, 5, 5, 5])).toBe(50);
  });
  it("sin con quién comparar es null", () => {
    expect(percentileRank(3, [])).toBeNull();
  });
});

describe("rankDesc", () => {
  const rows = [
    { n: "Beto", v: 3 },
    { n: "Ana", v: 3 },
    { n: "Ñandú", v: 9 },
    { n: "Zoe", v: 1 },
  ];
  it("ordena con desempate alfabético y numera con empates", () => {
    const r = rankDesc(rows, (x) => x.v, (x) => x.n);
    expect(r.map((x) => [x.rank, x.item.n])).toEqual([[1, "Ñandú"], [2, "Ana"], [2, "Beto"], [4, "Zoe"]]);
  });
  it("es estable y no muta la entrada", () => {
    const copy = [...rows];
    const a = rankDesc(rows, (x) => x.v, () => "");
    expect(rows).toEqual(copy);
    expect(a.slice(1, 3).map((x) => x.item.n)).toEqual(["Beto", "Ana"]); // mismo nombre: queda el orden original
  });
});

describe("efectividad y veredictos", () => {
  it("exige 5 partidos para tener efectividad", () => {
    expect(fanEffectiveness({ played: 4, won: 4, drawn: 0 })).toBeNull();
    expect(fanEffectiveness({ played: 5, won: 3, drawn: 0 })).toBe(60);
  });
  it("reparte cábala/neutro/yeta y los porcentajes suman 100", () => {
    expect(verdictShares([80, 70, 50, 10])).toBeNull();
    const s = verdictShares([80, 70, 50, 60, 10, 20, 30])!;
    expect([s.cabala, s.neutro, s.yeta]).toEqual([2, 2, 3]);
    expect(s.pct.cabala + s.pct.neutro + s.pct.yeta).toBe(100);
    const t = verdictShares([61, 50, 39, 40, 41, 90])!; // 60 exacto no es cábala, 40 exacto no es yeta
    expect([t.cabala, t.neutro, t.yeta]).toEqual([2, 3, 1]);
    expect(t.pct.cabala + t.pct.neutro + t.pct.yeta).toBe(100);
  });
});
