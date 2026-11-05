import { describe, expect, it } from "vitest";
import { argMax, groupBySeason, pct01, signed, spacedLabels, zoneOf } from "../src/components/carnet/helpers.ts";

describe("helpers del carnet", () => {
  it("zonas del Mufómetro", () => {
    expect(zoneOf(0.61)).toBe("win");
    expect(zoneOf(0.6)).toBe("draw");
    expect(zoneOf(0.39)).toBe("loss");
  });
  it("formatea porcentajes y diferencias", () => {
    expect(pct01(0.5714)).toBe("57%");
    expect(pct01(null)).toBe("—");
    expect(signed(18.2)).toBe("+18");
    expect(signed(-9)).toBe("−9");
  });
  it("agrupa por temporada, la más reciente primero", () => {
    const g = groupBySeason([{ season: 2018, n: 1 }, { season: 2025, n: 2 }, { season: 2018, n: 3 }]);
    expect(g.map((x) => x.season)).toEqual([2025, 2018]);
    expect(g[1].items.map((i) => i.n)).toEqual([1, 3]);
  });
  it("argMax ignora ceros y separa etiquetas", () => {
    expect(argMax([0, 0])).toBe(-1);
    expect(argMax([1, 5, 2])).toBe(1);
    expect(spacedLabels([{ x: 0, text: "a" }, { x: 10, text: "b" }, { x: 50, text: "c" }], 38).map((l) => l.text)).toEqual(["a", "c"]);
  });
});
