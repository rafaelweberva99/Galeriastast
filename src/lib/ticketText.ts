/**
 * Utilidades puras para leer capturas de comprobantes (sin DOM ni base de datos): sirven tanto en el
 * navegador (antes y después del OCR) como en el servidor y en los tests.
 */

/** Línea que separa el texto de una captura del de la siguiente: cada captura se analiza por separado. */
export const CAPTURE_BREAK = "\n\n=== captura ===\n\n";
export const CAPTURE_BREAK_RE = /^\s*={3}\s*captura\s*={3}\s*$/im;

/** Cuánto "se entendió" de un texto leído por OCR: fechas y partidos ("X vs. Y") reconocibles. */
export function ocrQuality(text: string): { dates: number; versus: number; score: number } {
  const t = text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const numeric = t.match(/\b\d{1,2}[/.-]\d{1,2}[/.-](?:\d{4}|\d{2})\b/g)?.length ?? 0;
  const words =
    t.match(/\b\d{1,2}(?:\s+de)?[\s./-]+(?:ene|feb|mar|abr|may|jun|jul|ago|sep|set|oct|nov|dic)[a-z]*\.?/g)?.length ?? 0;
  const versus = t.match(/\bvs\.?(?=\s)/g)?.length ?? 0;
  return { dates: numeric + words, versus, score: numeric + words + versus };
}

/** ¿Vale la pena repetir la lectura reforzando el contraste? (no se entendió ninguna fecha o ningún partido) */
export function needsContrastRetry(text: string): boolean {
  const q = ocrQuality(text);
  return q.dates === 0 || q.versus === 0;
}

/**
 * Las capturas de "Mis compras" muestran los datos en gris claro sobre blanco: Tesseract los ignora y solo lee
 * las etiquetas negras. En una imagen RGBA ya pasada a grises, oscurece todo lo que no sea fondo claro
 * (< 215 → negro, el resto → blanco). Solo actúa en páginas claras (≥ 50 % de píxeles casi blancos): una captura
 * con fondos de color no se toca. Devuelve si cambió algo.
 */
export function liftLightText(rgba: Uint8ClampedArray, threshold = 215): boolean {
  let light = 0;
  const pixels = rgba.length / 4;
  for (let i = 0; i < rgba.length; i += 4) if (rgba[i] > 235) light++;
  if (light / pixels < 0.5) return false;
  for (let i = 0; i < rgba.length; i += 4) {
    const v = rgba[i] < threshold ? 0 : 255;
    rgba[i] = rgba[i + 1] = rgba[i + 2] = v;
  }
  return true;
}
