/** La camiseta de los 100: como el jugador que cumple 100 partidos, el hincha la desbloquea en la galería. */
export const CENTENARIO_GOAL = 100;
const GOAL = CENTENARIO_GOAL;

/** Frase en broma según cuánto falta para la camiseta de los 100 (como la que recibe un jugador). */
export function centenarioTeaser(total: number, owner: boolean): string {
  const left = GOAL - total;
  const faltan = `${owner ? "te" : "le"} ${left === 1 ? "falta 1" : `faltan ${left}`}`;
  if (total === 0) return `Todavía no debuta en la galería: ${faltan}.`;
  if (total < 10) return `Recién ${owner ? "estás" : "está"} pidiendo cancha: ${faltan}.`;
  if (total < 25) return `Ya ${owner ? "te sabes" : "se sabe"} el camino al estadio. Aún ${faltan}.`;
  if (total < 50) return `Titular en la galería, pero ${faltan}.`;
  if (total < 75) return `Pasó la mitad: ya se puede ir eligiendo la talla. ${faltan[0].toUpperCase()}${faltan.slice(1)}.`;
  if (total < 90) return `Recta final: el utilero ya anda buscando el ${GOAL}. ${faltan[0].toUpperCase()}${faltan.slice(1)}.`;
  return `¡${owner ? "Te" : "Le"} ${left === 1 ? "falta uno" : `faltan ${left}`}! Que alguien vaya preparando la foto con la camiseta.`;
}

