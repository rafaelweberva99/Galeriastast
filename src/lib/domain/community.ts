/**
 * Lógica pura de las estadísticas de la comunidad: privacidad (k-anonimato), percentiles y ordenamientos.
 * Nada de acceso a base de datos aquí.
 */
import { MIN_MATCHES_FOR_VERDICT } from "./stats.ts";

/** Mínimo de hinchas públicos detrás de una cifra agregada; con menos, no se muestra ("pocos datos"). */
export const MIN_COMMUNITY_FANS = 2;

/** Devuelve `value` solo si hay al menos `MIN_COMMUNITY_FANS` hinchas detrás; si no, null. */
export function privacyGate<T>(fans: number, value: T): T | null {
  return fans >= MIN_COMMUNITY_FANS ? value : null;
}

/** Cuántos hinchas faltan para destrabar las cifras (0 si ya alcanza). */
export function fansMissing(fans: number): number {
  return Math.max(0, MIN_COMMUNITY_FANS - fans);
}

/**
 * Percentil (0–100) de `value` dentro de `others` (los demás hinchas, sin contarlo a él):
 * % de hinchas con un valor menor, con los empates contando la mitad. null si no hay con quién comparar.
 */
export function percentileRank(value: number, others: number[]): number | null {
  if (others.length === 0) return null;
  let below = 0;
  let equal = 0;
  for (const o of others) {
    if (o < value) below++;
    else if (o === value) equal++;
  }
  return ((below + equal / 2) / others.length) * 100;
}

export interface Ranked<T> {
  rank: number;
  item: T;
}

/**
 * Ordena de mayor a menor por `score` con desempate estable por `name` (alfabético, sin tildes) y
 * numera con empates ("1, 2, 2, 4"). No modifica el arreglo original.
 */
export function rankDesc<T>(items: T[], score: (t: T) => number, name: (t: T) => string): Ranked<T>[] {
  const sorted = items
    .map((item, i) => ({ item, i, s: score(item), n: name(item) }))
    .sort((a, b) => b.s - a.s || a.n.localeCompare(b.n, "es") || a.i - b.i);
  const out: Ranked<T>[] = [];
  sorted.forEach((x, idx) => {
    const prev = out[idx - 1];
    const rank = prev && sorted[idx - 1].s === x.s ? prev.rank : idx + 1;
    out.push({ rank, item: x.item });
  });
  return out;
}

export interface FanLine {
  /** Partidos con su club en cancha (los que cuentan para el Mufómetro). */
  played: number;
  won: number;
  drawn: number;
}

/** Efectividad (%) de un hincha, o null si aún no tiene los partidos mínimos para tener veredicto. */
export function fanEffectiveness(f: FanLine): number | null {
  if (f.played < MIN_MATCHES_FOR_VERDICT) return null;
  return ((f.won * 3 + f.drawn) / (f.played * 3)) * 100;
}

export interface VerdictShares {
  fans: number;
  cabala: number;
  neutro: number;
  yeta: number;
  /** Porcentajes enteros que suman 100. */
  pct: { cabala: number; neutro: number; yeta: number };
}

/** Reparto cábala / neutro / yeta (mismos umbrales del Mufómetro: >60 y <40). null con muestra insuficiente. */
export function verdictShares(effs: number[]): VerdictShares | null {
  if (effs.length < MIN_COMMUNITY_FANS) return null;
  const cabala = effs.filter((e) => e > 60).length;
  const yeta = effs.filter((e) => e < 40).length;
  const neutro = effs.length - cabala - yeta;
  // Método del mayor resto, para que los porcentajes redondeados sumen 100.
  const raw = [cabala, neutro, yeta].map((n) => (n / effs.length) * 100);
  const floor = raw.map(Math.floor);
  let left = 100 - floor.reduce((a, b) => a + b, 0);
  raw
    .map((r, i) => ({ i, f: r - Math.floor(r) }))
    .sort((a, b) => b.f - a.f || a.i - b.i)
    .forEach(({ i }) => {
      if (left-- > 0) floor[i]++;
    });
  return { fans: effs.length, cabala, neutro, yeta, pct: { cabala: floor[0], neutro: floor[1], yeta: floor[2] } };
}

/** Promedio simple, o null si no hay datos. */
export function mean(xs: number[]): number | null {
  return xs.length === 0 ? null : xs.reduce((a, b) => a + b, 0) / xs.length;
}

export interface CommunityComparison {
  clubId: string;
  /** Hinchas públicos del club (sin contar al propio hincha si su perfil es privado). */
  fans: number;
  attended: number;
  /** Posición por partidos marcados dentro del club (1 = el que más fue) y total de hinchas comparados. */
  attendedRank: number;
  attendedOf: number;
  /** % de hinchas del club a los que supera en partidos marcados. */
  attendedPercentile: number;
  /** Efectividad y su percentil; null si él o muy pocos tienen veredicto. */
  effectiveness: number | null;
  effectivenessPercentile: number | null;
  effectivenessRank: number | null;
  effectivenessOf: number | null;
}
