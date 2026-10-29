import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Centenario } from "../src/components/Centenario.tsx";
import { clubIdentity } from "../src/lib/clubTheme.ts";

const club = clubIdentity({ id: "universidad-de-chile", shortName: "U. de Chile", colorPrimary: "#003399", colorSecondary: "#ffffff" });
const html = (total: number, owner = true) => renderToStaticMarkup(createElement(Centenario, { club, total, owner }));

describe("la camiseta de los 100", () => {
  it("bloqueada antes de 100, con lo que falta", () => {
    const h = html(75);
    expect(h).toContain("locked");
    expect(h).toContain("Te faltan 25");
    expect(h).toContain("75</strong> de 100");
  });
  it("habla en tercera persona en el carnet público", () => {
    expect(html(99, false)).toContain("¡Le falta uno!");
  });
  it("se desbloquea en 100 y apunta a la de los 200", () => {
    const h = html(100);
    expect(h).toContain("unlocked");
    expect(h).toContain("¡Desbloqueada!");
    expect(h).toContain("la de los 200");
    expect(h).not.toContain("🔒");
  });
});
