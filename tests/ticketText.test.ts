import { describe, expect, it } from "vitest";
import { liftLightText, needsContrastRetry, ocrQuality } from "../src/lib/ticketText.ts";

describe("ocrQuality / needsContrastRetry", () => {
  it("pide reintentar cuando solo se leyeron las etiquetas (los valores en gris claro no salieron)", () => {
    expect(needsContrastRetry("N* de Orden\nFecha Compra\nEvento\nMedio Pago\nTipo Envío\nTotal\nEstado")).toBe(true);
  });
  it("no reintenta cuando se leyó una fecha y un partido", () => {
    const text = "Fecha Compra 12-08-2025\nEvento Universidad de Chile\nvs. Audax Italiano - Fecha 20";
    expect(ocrQuality(text)).toMatchObject({ dates: 1, versus: 1 });
    expect(needsContrastRetry(text)).toBe(false);
    expect(needsContrastRetry("Colo-Colo vs. O'Higgins\nlun. 24 feb. - 20:00 hrs")).toBe(false);
  });
});

describe("liftLightText", () => {
  const rgba = (grays: number[]) => new Uint8ClampedArray(grays.flatMap((g) => [g, g, g, 255]));

  it("oscurece el gris claro de una página blanca y deja el fondo blanco", () => {
    const px = rgba([255, 255, 255, 255, 255, 255, 170, 0, 230, 255]);
    expect(liftLightText(px)).toBe(true);
    expect([...px].filter((_, i) => i % 4 === 0)).toEqual([255, 255, 255, 255, 255, 255, 0, 0, 255, 255]);
  });

  it("no toca una captura con fondo oscuro o de color", () => {
    const px = rgba([20, 30, 40, 200, 90, 255]);
    const before = [...px];
    expect(liftLightText(px)).toBe(false);
    expect([...px]).toEqual(before);
  });
});
