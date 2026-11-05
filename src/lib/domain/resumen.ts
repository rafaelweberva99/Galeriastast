/**
 * "Tu año en la galería": resumen anual de un hincha. Lógica pura (sin base de datos ni React).
 * Solo cuentan los partidos jugados de su club que marcó con fecha en ese año calendario.
 */
import { scorersSeen, type ScorerTally } from "./scorers.ts";
import { decidedOutcome, effectiveness, outcomeFor, recordFor } from "./stats.ts";
import type { Goal, Match, Outcome, Rivalry, TeamRecord } from "./types.ts";
import { involves, isPlayed } from "./stats.ts";

export const MONTHS_ES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

export interface ResumenMatch {
  match: Match;
  outcome: Outcome;
  /** Goles del club del hincha menos goles del rival. */
  margin: number;
  goalsFor: number;
  goalsAgainst: number;
}

export type MatchOfYearReason = "final" | "clasico" | "goleada" | "goles" | "unico";

export type TitleKey =
  | "de-paso"
  | "ocasional"
  | "testigo-de-gloria"
  | "cabala"
  | "sufridor"
  | "invicto"
  | "goleador"
  | "fiel"
  | "parejo";

export interface YearTitle {
  key: TitleKey;
  label: string;
  /** Una línea que explica por qué se ganó el apodo. */
  blurb: string;
}

export interface PreviousYear {
  year: number;
  played: number;
  effectiveness: number | null;
  /** Partidos de este año menos los del anterior. */
  deltaPlayed: number;
  /** Puntos porcentuales de efectividad (este año - anterior); null si falta alguno. */
  deltaEffectiveness: number | null;
}

export interface Resumen {
  year: number;
  played: number;
  record: TeamRecord;
  effectiveness: number | null;
  /** Efectividad del club en el año (todos sus partidos jugados), para comparar. */
  clubEffectiveness: number | null;
  /** Efectividad con el hincha menos la del club, en puntos porcentuales. */
  deltaVsClub: number | null;
  matchOfYear: (ResumenMatch & { reason: MatchOfYearReason }) | null;
  bestWin: ResumenMatch | null;
  worstLoss: ResumenMatch | null;
  /** Mes (1–12) con más partidos. */
  busiestMonth: { month: number; name: string; count: number } | null;
  /** Racha más larga del año: de victorias si hay 2 o más; si no, de partidos sin perder. */
  streak: { kind: "wins" | "unbeaten"; length: number } | null;
  longestWin: number;
  longestUnbeaten: number;
  longestWinless: number;
  /** Resultados en orden cronológico (para dibujar la racha). */
  sequence: Outcome[];
  topRival: { teamId: string; name: string; count: number } | null;
  idol: ScorerTally | null;
  executioner: ScorerTally | null;
  goalsSeenFor: number;
  goalsSeenAgainst: number;
  matchesWithGoals: number;
  first: ResumenMatch | null;
  last: ResumenMatch | null;
  previous: PreviousYear | null;
  title: YearTitle;
}

export const yearOf = (m: Pick<Match, "date">): number => Number(m.date.slice(0, 4));

/** Años (de más reciente a más antiguo) en que el hincha fue al menos a un partido jugado de su club. */
export function yearsWithMatches(attended: Match[], clubId: string): number[] {
  const set = new Set<number>();
  for (const m of attended) if (involves(m, clubId) && isPlayed(m)) set.add(yearOf(m));
  return [...set].sort((a, b) => b - a);
}

function describe(m: Match, clubId: string): ResumenMatch | null {
  const outcome = outcomeFor(m, clubId);
  if (!outcome) return null;
  const home = m.homeTeamId === clubId;
  const goalsFor = (home ? m.homeGoals : m.awayGoals)!;
  const goalsAgainst = (home ? m.awayGoals : m.homeGoals)!;
  return { match: m, outcome, margin: goalsFor - goalsAgainst, goalsFor, goalsAgainst };
}

function isClasico(m: Match, rivalries: Rivalry[]): boolean {
  return rivalries.some((r) => (r.teamA === m.homeTeamId && r.teamB === m.awayTeamId) || (r.teamA === m.awayTeamId && r.teamB === m.homeTeamId));
}

/** Más reciente primero; el id desempata para que el resultado sea estable. */
const newer = (a: Match, b: Match) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id);

function matchesOfYear(attended: Match[], clubId: string, year: number): Match[] {
  const seen = new Set<string>();
  return attended
    .filter((m) => involves(m, clubId) && isPlayed(m) && yearOf(m) === year && !seen.has(m.id) && seen.add(m.id))
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}

function longestRun(outcomes: Outcome[], pred: (o: Outcome) => boolean): number {
  let best = 0;
  let run = 0;
  for (const o of outcomes) {
    run = pred(o) ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
}

export function pickTitle(s: {
  year: number;
  played: number;
  effectiveness: number | null;
  wonFinal: boolean;
  longestUnbeaten: number;
  goalsPerGame: number | null;
  matchesWithGoals: number;
}): YearTitle {
  const { year, played, effectiveness: eff } = s;
  if (played <= 2) return { key: "de-paso", label: "Hincha de Paso", blurb: `Poquitos partidos, pero estuviste en la galería en ${year}.` };
  if (played < 5)
    return { key: "ocasional", label: "Hincha Ocasional", blurb: `${played} partidos en ${year}: con 5 o más el Mufómetro ya te da veredicto.` };
  if (s.wonFinal) return { key: "testigo-de-gloria", label: "Testigo de Gloria", blurb: "Estuviste en una final y tu club la ganó." };
  if (eff !== null && eff >= 70) return { key: "cabala", label: `El Cábala del ${year}`, blurb: `Tu club sumó ${Math.round(eff)}% de los puntos cuando fuiste.` };
  if (eff !== null && eff <= 30) return { key: "sufridor", label: "El Sufridor", blurb: `Solo ${Math.round(eff)}% de efectividad: igual fuiste, y eso también es amor.` };
  if (s.longestUnbeaten >= 6) return { key: "invicto", label: "El Invicto", blurb: `${s.longestUnbeaten} partidos seguidos sin ver perder a tu club.` };
  if (s.goalsPerGame !== null && s.matchesWithGoals >= 5 && s.goalsPerGame >= 3.5)
    return { key: "goleador", label: "Hincha Goleador", blurb: "Tus partidos tuvieron goles de sobra." };
  if (played >= 15) return { key: "fiel", label: "Hincha Fiel", blurb: `${played} partidos en la galería en un solo año.` };
  return { key: "parejo", label: "Hincha Parejo", blurb: "Ni cábala ni yeta: un año de galería sin trampa." };
}

/**
 * Resumen de `year`. `attended` puede traer partidos de cualquier año/club (se filtra aquí);
 * `clubMatches` son todos los partidos del club (para compararlo con el hincha).
 */
export function buildResumen(opts: {
  year: number;
  clubId: string;
  attended: Match[];
  goals: Map<string, Goal[]>;
  clubMatches: Match[];
  rivalries?: Rivalry[];
}): Resumen {
  const { year, clubId, attended, goals, clubMatches, rivalries = [] } = opts;
  const mine = matchesOfYear(attended, clubId, year);
  const described = mine.map((m) => describe(m, clubId)).filter((d): d is ResumenMatch => d !== null);
  const record = recordFor(mine, clubId);
  const eff = effectiveness(record);
  const clubEff = effectiveness(recordFor(clubMatches.filter((m) => yearOf(m) === year), clubId));
  const sequence = described.map((d) => d.outcome);

  // Partido del año: el más importante (final > clásico) o el más goleador.
  let matchOfYear: Resumen["matchOfYear"] = null;
  if (described.length === 1) matchOfYear = { ...described[0], reason: "unico" };
  else if (described.length > 1) {
    const score = (d: ResumenMatch) =>
      (d.match.isFinal ? 100 : 0) + (isClasico(d.match, rivalries) ? 60 : 0) + (d.goalsFor + d.goalsAgainst) * 10 + (d.outcome === "G" ? 5 : 0);
    const best = [...described].sort((a, b) => score(b) - score(a) || newer(a.match, b.match))[0];
    const reason: MatchOfYearReason = best.match.isFinal ? "final" : isClasico(best.match, rivalries) ? "clasico" : best.margin >= 3 || best.margin <= -3 ? "goleada" : "goles";
    matchOfYear = { ...best, reason };
  }

  const wins = described.filter((d) => d.outcome === "G").sort((a, b) => b.margin - a.margin || b.goalsFor - a.goalsFor || newer(a.match, b.match));
  const losses = described.filter((d) => d.outcome === "P").sort((a, b) => a.margin - b.margin || b.goalsAgainst - a.goalsAgainst || newer(a.match, b.match));

  const perMonth = new Map<number, number>();
  for (const m of mine) {
    const mo = Number(m.date.slice(5, 7));
    perMonth.set(mo, (perMonth.get(mo) ?? 0) + 1);
  }
  const month = [...perMonth].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0];

  const longestWin = longestRun(sequence, (o) => o === "G");
  const longestUnbeaten = longestRun(sequence, (o) => o !== "P");
  const longestWinless = longestRun(sequence, (o) => o !== "G");
  const streak: Resumen["streak"] =
    longestWin >= 2 ? { kind: "wins", length: longestWin } : longestUnbeaten >= 1 && described.length ? { kind: "unbeaten", length: longestUnbeaten } : null;

  const byRival = new Map<string, { name: string; count: number; last: string }>();
  for (const d of described) {
    const home = d.match.homeTeamId === clubId;
    const id = home ? d.match.awayTeamId : d.match.homeTeamId;
    const e = byRival.get(id) ?? { name: home ? d.match.awayTeamName : d.match.homeTeamName, count: 0, last: "" };
    e.count++;
    if (d.match.date > e.last) e.last = d.match.date;
    byRival.set(id, e);
  }
  const rival = [...byRival].sort((a, b) => b[1].count - a[1].count || b[1].last.localeCompare(a[1].last) || a[1].name.localeCompare(b[1].name, "es"))[0];

  const sc = scorersSeen(mine, goals, clubId);

  const prevMatches = matchesOfYear(attended, clubId, year - 1);
  const prevEff = effectiveness(recordFor(prevMatches, clubId));
  const previous: PreviousYear | null = prevMatches.length
    ? {
        year: year - 1,
        played: prevMatches.length,
        effectiveness: prevEff,
        deltaPlayed: described.length - prevMatches.length,
        deltaEffectiveness: eff !== null && prevEff !== null ? eff - prevEff : null,
      }
    : null;

  const title = pickTitle({
    year,
    played: described.length,
    effectiveness: eff,
    wonFinal: described.some((d) => d.match.isFinal && decidedOutcome(d.match, clubId) === "G"),
    longestUnbeaten,
    goalsPerGame: sc.matchesWithGoals ? (sc.goalsFor + sc.goalsAgainst) / sc.matchesWithGoals : null,
    matchesWithGoals: sc.matchesWithGoals,
  });

  return {
    year,
    played: described.length,
    record,
    effectiveness: eff,
    clubEffectiveness: clubEff,
    deltaVsClub: eff !== null && clubEff !== null ? eff - clubEff : null,
    matchOfYear,
    bestWin: wins[0] ?? null,
    worstLoss: losses[0] ?? null,
    busiestMonth: month ? { month: month[0], name: MONTHS_ES[month[0] - 1], count: month[1] } : null,
    streak,
    longestWin,
    longestUnbeaten,
    longestWinless,
    sequence,
    topRival: rival ? { teamId: rival[0], name: rival[1].name, count: rival[1].count } : null,
    idol: sc.idols[0] ?? null,
    executioner: sc.executioners[0] ?? null,
    goalsSeenFor: sc.goalsFor,
    goalsSeenAgainst: sc.goalsAgainst,
    matchesWithGoals: sc.matchesWithGoals,
    first: described[0] ?? null,
    last: described[described.length - 1] ?? null,
    previous,
    title,
  };
}
