/**
 * Niveles del carnet y premios del hincha.
 * - Nivel del carnet según partidos en la galería: Socio, Bronce (25), Plata (50), Oro (100), Leyenda (200).
 * - "Una rueda completa": 32 partidos en la galería, de local o de visita.
 * - "Temporada perfecta": fue a todos los partidos de liga de su club en una temporada ya terminada;
 *   la versión "total" exige todos los partidos oficiales del año (liga, copas e internacionales).
 */
import type { Match } from "./types.ts";

export type TierKey = "socio" | "bronce" | "plata" | "oro" | "leyenda";

export interface Tier {
  key: TierKey;
  label: string;
  /** Partidos desde los que se obtiene. */
  min: number;
}

export const TIERS: Tier[] = [
  { key: "socio", label: "Socio", min: 0 },
  { key: "bronce", label: "Carnet Bronce", min: 25 },
  { key: "plata", label: "Carnet Plata", min: 50 },
  { key: "oro", label: "Carnet Oro", min: 100 },
  { key: "leyenda", label: "Carnet Leyenda", min: 200 },
];

export const RUEDA_COMPLETA = 32;

export function tierFor(total: number): Tier {
  return [...TIERS].reverse().find((t) => total >= t.min)!;
}

export function nextTier(total: number): Tier | null {
  return TIERS.find((t) => t.min > total) ?? null;
}

export interface PerfectSeason {
  season: number;
  /** Partidos del club en esa temporada (liga, o todos si es total). */
  matches: number;
}

export interface Achievements {
  total: number;
  tier: Tier;
  next: Tier | null;
  rueda: { done: boolean; missing: number };
  /** Temporadas en que fue a todos los partidos de liga. */
  perfectLeague: PerfectSeason[];
  /** Temporadas en que fue a todos los partidos oficiales. */
  perfectTotal: PerfectSeason[];
  /** La temporada terminada más cercana a ser perfecta (liga), para mostrar cuánto faltó. */
  closest: { season: number; attended: number; matches: number } | null;
}

/**
 * @param attendedIds partidos marcados por el hincha (de su club)
 * @param clubMatches todos los partidos del club en la base
 * @param today fecha de hoy (yyyy-mm-dd): solo cuentan temporadas ya terminadas
 */
export function computeAchievements(total: number, attendedIds: Set<string>, clubMatches: Match[], today: string): Achievements {
  const bySeason = new Map<number, Match[]>();
  for (const m of clubMatches) bySeason.set(m.season, [...(bySeason.get(m.season) ?? []), m]);
  const perfectLeague: PerfectSeason[] = [];
  const perfectTotal: PerfectSeason[] = [];
  let closest: Achievements["closest"] = null;
  for (const [season, matches] of bySeason) {
    if (matches.some((m) => m.date >= today)) continue; // temporada en curso
    const league = matches.filter((m) => m.competitionId === "primera-division");
    const went = (list: Match[]) => list.filter((m) => attendedIds.has(m.id)).length;
    if (league.length) {
      const n = went(league);
      if (n === league.length) perfectLeague.push({ season, matches: league.length });
      else if (n > 0 && (!closest || n / league.length > closest.attended / closest.matches)) {
        closest = { season, attended: n, matches: league.length };
      }
    }
    if (matches.length && went(matches) === matches.length) perfectTotal.push({ season, matches: matches.length });
  }
  const bySeasonDesc = (a: PerfectSeason, b: PerfectSeason) => b.season - a.season;
  return {
    total,
    tier: tierFor(total),
    next: nextTier(total),
    rueda: { done: total >= RUEDA_COMPLETA, missing: Math.max(0, RUEDA_COMPLETA - total) },
    perfectLeague: perfectLeague.sort(bySeasonDesc),
    perfectTotal: perfectTotal.sort(bySeasonDesc),
    closest: perfectLeague.length ? null : closest,
  };
}
