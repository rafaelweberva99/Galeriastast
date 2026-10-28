/**
 * Clubes habilitados en el MVP (data/catalog/mvp.json): solo los que tienen su historial de Primera
 * completo y verificado. Los demás siguen en la base como rivales, pero no se ofrecen para crear
 * carnet ni tienen página propia. MVP_ALL_CLUBS=1 los muestra todos.
 */
import mvp from "../../data/catalog/mvp.json" with { type: "json" };

const enabled = mvp.enabled && process.env.MVP_ALL_CLUBS !== "1";
export const MVP_CLUBS: readonly string[] = mvp.clubs;

export function isVisibleClub(id: string): boolean {
  return !enabled || MVP_CLUBS.includes(id);
}

export function visibleClubs<T extends { id: string }>(clubs: T[]): T[] {
  return clubs.filter((c) => isVisibleClub(c.id));
}

export const MVP_ACTIVE = enabled;
