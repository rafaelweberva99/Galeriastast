import type { Carnet } from "./domain/stats.ts";
import { CENTENARIO_GOAL } from "./domain/centenario.ts";

/** Texto para compartir el carnet en X/Twitter u otras redes. */
export function shareText(carnet: Carnet, clubShort: string): string {
  const n = carnet.total;
  if (n === 0) return `Armé mi carnet de hincha de ${clubShort} en GaluchaStats. ¿Eres cábala o yeta?`;
  const eff = carnet.effectiveness === null ? "" : ` con ${Math.round(carnet.effectiveness)}% de efectividad`;
  const verdict = carnet.effectiveness === null ? "" : ` Veredicto del Mufómetro: ${carnet.verdict.label}.`;
  const shirt =
    n >= CENTENARIO_GOAL ? " Ya desbloqueé la camiseta de los 100." : ` Me faltan ${CENTENARIO_GOAL - n} para la camiseta de los 100.`;
  return `Fui a ${n} ${n === 1 ? "partido" : "partidos"} de ${clubShort} en la galería${eff}.${verdict}${shirt} ¿Y tú?`;
}
