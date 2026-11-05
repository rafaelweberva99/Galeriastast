/** Utilidades puras de agregación para los insights: registros, efectividad, fases, fechas. */
import { involves, isPlayed, outcomeFor } from "../stats.ts";
import type { Match } from "../types.ts";
import type { PhaseKind, Rated, Record3 } from "./types.ts";

/** Marcador desde la óptica del club: [a favor, en contra]. Requiere partido jugado. */
export function scoreFor(m: Match, clubId: string): [number, number] {
  return m.homeTeamId === clubId ? [m.homeGoals ?? 0, m.awayGoals ?? 0] : [m.awayGoals ?? 0, m.homeGoals ?? 0];
}

/** Diferencia de gol del club (positiva si ganó). */
export function marginFor(m: Match, clubId: string): number {
  const [gf, ga] = scoreFor(m, clubId);
  return gf - ga;
}

export function record3(matches: Match[], clubId: string): Record3 {
  const r: Record3 = { pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0 };
  for (const m of matches) {
    const o = outcomeFor(m, clubId);
    if (!o) continue;
    const [gf, ga] = scoreFor(m, clubId);
    r.pj++;
    r.gf += gf;
    r.gc += ga;
    if (o === "G") r.g++;
    else if (o === "E") r.e++;
    else r.p++;
  }
  return r;
}

/** Efectividad 0 a 1 (null si no hay partidos). */
export function eff01(r: Pick<Record3, "pj" | "g" | "e">): number | null {
  return r.pj === 0 ? null : (r.g * 3 + r.e) / (r.pj * 3);
}

export function rated(matches: Match[], clubId: string): Rated {
  const r = record3(matches, clubId);
  return { ...r, effectiveness: eff01(r) ?? 0 };
}

export function groupBy<T, K>(items: T[], keyOf: (t: T) => K): Map<K, T[]> {
  const out = new Map<K, T[]>();
  for (const it of items) {
    const k = keyOf(it);
    const list = out.get(k);
    if (list) list.push(it);
    else out.set(k, [it]);
  }
  return out;
}

/** Partidos jugados del club, sin duplicados, en orden cronológico estable. */
export function playedOf(matches: Match[], clubId: string, today?: string): Match[] {
  const seen = new Set<string>();
  const out: Match[] = [];
  for (const m of matches) {
    if (seen.has(m.id) || !involves(m, clubId) || !isPlayed(m)) continue;
    if (today && m.date > today) continue;
    seen.add(m.id);
    out.push(m);
  }
  return out.sort(byDate);
}

export function byDate(a: Match, b: Match): number {
  return a.date.localeCompare(b.date) || a.id.localeCompare(b.id);
}

/** Fase del torneo deducida de `isFinal`, `stage` y el tipo de competencia. */
export function phaseOf(m: Match): PhaseKind {
  const stage = (m.stage ?? "").toLowerCase();
  if (m.isFinal || /^final\b/.test(stage)) return "final";
  if (/grupo/.test(stage)) return "grupos";
  if (/^fecha\s*\d+/.test(stage)) return "liga";
  if (/(octavos|cuartos|semifinal|ronda|fase|promoci|repechaje|ida|vuelta|playoff|liguilla|eliminatoria)/.test(stage)) {
    return "eliminatoria";
  }
  if (!stage && m.competitionKind === "liga") return "liga";
  return "otro";
}

export const PHASE_ORDER: PhaseKind[] = ["liga", "grupos", "eliminatoria", "final", "otro"];

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
export const MONTH_NAMES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
export const WEEKDAY_NAMES = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

export function monthIndex(date: string): number {
  return Number(date.slice(5, 7)) - 1;
}

export function weekdayIndex(date: string): number {
  return new Date(Date.UTC(Number(date.slice(0, 4)), monthIndex(date), Number(date.slice(8, 10)))).getUTCDay();
}

/** "mar de 2017", "entre mar y ago de 2017" o "entre nov de 2016 y feb de 2017". */
export function spanLabel(from: string, to: string): string {
  const fy = from.slice(0, 4);
  const ty = to.slice(0, 4);
  const fm = MONTHS[monthIndex(from)];
  const tm = MONTHS[monthIndex(to)];
  if (fy === ty && fm === tm) return `en ${fm} de ${fy}`;
  if (fy === ty) return `entre ${fm} y ${tm} de ${fy}`;
  return `entre ${fm} de ${fy} y ${tm} de ${ty}`;
}

export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

export const pct = (x: number): string => `${Math.round(x * 100)} %`;

/** Nombre del club tomado de los partidos (cualquier lado en que juegue). */
export function clubNameFrom(matches: Match[], clubId: string): string {
  for (const m of matches) {
    if (m.homeTeamId === clubId) return m.homeTeamName;
    if (m.awayTeamId === clubId) return m.awayTeamName;
  }
  return "tu club";
}

export function scoreLabel(m: Match): string {
  return `${m.homeTeamName} ${m.homeGoals}-${m.awayGoals} ${m.awayTeamName}`;
}
