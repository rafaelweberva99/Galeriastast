/**
 * Motor de estadísticas avanzadas del hincha. Función pura y determinista: sin base de datos, sin React, sin reloj
 * (la fecha de "hoy" solo entra por `opts.today`).
 */
import { decidedOutcome, involves, outcomeFor } from "../stats.ts";
import type { AttendedMatch, Match } from "../types.ts";
import {
  PHASE_ORDER,
  clubNameFrom,
  eff01,
  groupBy,
  marginFor,
  monthIndex,
  phaseOf,
  playedOf,
  rated,
  record3,
  scoreLabel,
  weekdayIndex,
} from "./aggregate.ts";
import { buildHighlights } from "./highlights.ts";
import type {
  CompetitionInsight,
  Distributions,
  FormPoint,
  GoalInsights,
  Insights,
  MissedInsights,
  PhaseInsight,
  Records,
  RivalInsight,
  SeasonInsight,
  StreakInfo,
  Verdict,
} from "./types.ts";

export type { Insights } from "./types.ts";

/** Umbrales del veredicto por rival. */
export const RIVAL_MIN_MATCHES = 3;
export const RIVAL_VERDICT_GAP = 0.15;
const BIG_MARGIN = 3;
const MIN_SEASON_FOR_RECORD = 3;

export interface InsightsOptions {
  /** Fecha ISO de "hoy": se ignoran los partidos posteriores. */
  today?: string;
}

function seasonsOf(mine: Match[], clubPlayed: Match[], clubId: string): SeasonInsight[] {
  const clubBySeason = groupBy(clubPlayed, (m) => m.season);
  return [...groupBy(mine, (m) => m.season).entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([season, ms]) => {
      const r = rated(ms, clubId);
      const clubEff = eff01(record3(clubBySeason.get(season) ?? [], clubId));
      return { season, ...r, clubEffectiveness: clubEff, delta: clubEff === null ? null : (r.effectiveness - clubEff) * 100 };
    });
}

function formOf(mine: Match[], clubId: string): FormPoint[] {
  const pts: FormPoint[] = [];
  const outcomes: ("G" | "E" | "P")[] = [];
  let points = 0;
  mine.forEach((m, i) => {
    const o = outcomeFor(m, clubId)!;
    outcomes.push(o);
    points += o === "G" ? 3 : o === "E" ? 1 : 0;
    const last = outcomes.slice(-10);
    const rolling =
      outcomes.length >= 10 ? last.reduce((s, x) => s + (x === "G" ? 3 : x === "E" ? 1 : 0), 0) / 30 : null;
    pts.push({
      matchId: m.id,
      date: m.date,
      label: scoreLabel(m),
      outcome: o,
      cumulative: points / (3 * (i + 1)),
      rolling10: rolling,
    });
  });
  return pts;
}

function rivalsOf(mine: Match[], clubPlayed: Match[], clubId: string): RivalInsight[] {
  const opp = (m: Match) =>
    m.homeTeamId === clubId ? { id: m.awayTeamId, name: m.awayTeamName } : { id: m.homeTeamId, name: m.homeTeamName };
  const clubVs = groupBy(clubPlayed, (m) => opp(m).id);
  return [...groupBy(mine, (m) => opp(m).id).entries()]
    .map(([rivalId, ms]): RivalInsight => {
      const r = rated(ms, clubId);
      const clubEff = eff01(record3(clubVs.get(rivalId) ?? [], clubId));
      let verdict: Verdict = "neutro";
      if (r.pj < RIVAL_MIN_MATCHES) verdict = "poca-muestra";
      else if (clubEff !== null && r.effectiveness - clubEff >= RIVAL_VERDICT_GAP) verdict = "cabala";
      else if (clubEff !== null && clubEff - r.effectiveness >= RIVAL_VERDICT_GAP) verdict = "yeta";
      return {
        ...r,
        rivalId,
        rivalName: opp(ms[0]).name,
        clubEffectiveness: clubEff,
        verdict,
        lastMatchId: ms[ms.length - 1].id,
      };
    })
    .sort((a, b) => b.pj - a.pj || a.rivalName.localeCompare(b.rivalName, "es"));
}

function competitionsOf(mine: Match[], clubId: string): CompetitionInsight[] {
  return [...groupBy(mine, (m) => m.competitionId).entries()]
    .map(([competitionId, ms]) => ({
      competitionId,
      name: ms[0].competitionName,
      ...rated(ms, clubId),
      home: record3(ms.filter((m) => m.homeTeamId === clubId), clubId),
      away: record3(ms.filter((m) => m.awayTeamId === clubId), clubId),
    }))
    .sort((a, b) => b.pj - a.pj || a.name.localeCompare(b.name, "es"));
}

function phasesOf(mine: Match[], clubId: string): PhaseInsight[] {
  const groups = groupBy(mine, phaseOf);
  return PHASE_ORDER.filter((p) => groups.has(p)).map((phase) => ({ phase, ...rated(groups.get(phase)!, clubId) }));
}

function distributionsOf(mine: Match[], seasons: SeasonInsight[]): Distributions {
  const byMonth = new Array<number>(12).fill(0);
  const byWeekday = new Array<number>(7).fill(0);
  for (const m of mine) {
    byMonth[monthIndex(m.date)]++;
    byWeekday[weekdayIndex(m.date)]++;
  }
  return { byMonth, byWeekday, bySeason: seasons.map((s) => ({ season: s.season, pj: s.pj })) };
}

function goalsOf(mine: Match[], clubId: string): GoalInsights {
  const n = mine.length;
  let gf = 0;
  let gc = 0;
  let goalless = 0;
  let cleanSheets = 0;
  let bigWins = 0;
  let bigLosses = 0;
  let highest: Match | null = null;
  const shootouts = { pj: 0, won: 0, lost: 0 };
  for (const m of mine) {
    const f = m.homeTeamId === clubId ? m.homeGoals! : m.awayGoals!;
    const a = m.homeTeamId === clubId ? m.awayGoals! : m.homeGoals!;
    gf += f;
    gc += a;
    if (f === 0 && a === 0) goalless++;
    if (a === 0) cleanSheets++;
    if (f - a >= BIG_MARGIN) bigWins++;
    if (a - f >= BIG_MARGIN) bigLosses++;
    // En empate de goles, el más reciente (mine viene en orden cronológico).
    if (!highest || m.homeGoals! + m.awayGoals! >= highest.homeGoals! + highest.awayGoals!) highest = m;
    if (m.homePens !== null && m.awayPens !== null && f === a) {
      shootouts.pj++;
      if (decidedOutcome(m, clubId) === "G") shootouts.won++;
      else if (decidedOutcome(m, clubId) === "P") shootouts.lost++;
    }
  }
  return {
    forPerMatch: n ? gf / n : 0,
    againstPerMatch: n ? gc / n : 0,
    goalless,
    cleanSheets,
    bigWins,
    bigLosses,
    highestScoring: highest,
    shootouts,
  };
}

function missedOf(attendedIds: Set<string>, mine: Match[], clubPlayed: Match[], clubId: string): MissedInsights | null {
  const seasons = new Set(mine.map((m) => m.season));
  const absent = clubPlayed.filter((m) => seasons.has(m.season) && !attendedIds.has(m.id));
  if (mine.length === 0 || absent.length === 0) return null;
  // En empate de diferencia gana el más reciente (absent viene en orden cronológico).
  let bigWin: Match | null = null;
  let bigLoss: Match | null = null;
  for (const m of absent) {
    const d = marginFor(m, clubId);
    if (d > 0 && (!bigWin || d >= marginFor(bigWin, clubId))) bigWin = m;
    if (d < 0 && (!bigLoss || d <= marginFor(bigLoss, clubId))) bigLoss = m;
  }
  return {
    missed: absent.length,
    withYou: rated(mine, clubId),
    without: rated(absent, clubId),
    biggestWinMissed: bigWin,
    biggestLossMissed: bigLoss,
    finalsMissed: clubPlayedFinals(clubPlayed, attendedIds),
  };
}

function clubPlayedFinals(clubPlayed: Match[], attendedIds: Set<string>): Match[] {
  return clubPlayed.filter((m) => m.isFinal && !attendedIds.has(m.id));
}

/** Racha más larga que cumple `pred`; en empate gana la más antigua. */
function longestStreak(mine: Match[], clubId: string, pred: (o: "G" | "E" | "P") => boolean): StreakInfo | null {
  let best: StreakInfo | null = null;
  let start = -1;
  const close = (end: number) => {
    const len = end - start;
    if (start >= 0 && len > 0 && (!best || len > best.length)) {
      best = { length: len, from: mine[start].date, to: mine[end - 1].date };
    }
  };
  mine.forEach((m, i) => {
    if (pred(outcomeFor(m, clubId)!)) {
      if (start < 0) start = i;
    } else {
      close(i);
      start = -1;
    }
  });
  close(mine.length);
  return best;
}

function recordsOf(mine: Match[], seasons: SeasonInsight[], clubId: string): Records {
  const nums = seasons.map((s) => s.season);
  let run = 0;
  let seasonsInARow = 0;
  nums.forEach((s, i) => {
    run = i > 0 && s === nums[i - 1] + 1 ? run + 1 : 1;
    seasonsInARow = Math.max(seasonsInARow, run);
  });
  const eligible = seasons.filter((s) => s.pj >= MIN_SEASON_FOR_RECORD);
  let bestSeason: SeasonInsight | null = null;
  let worstSeason: SeasonInsight | null = null;
  for (const s of eligible) {
    if (!bestSeason || s.effectiveness > bestSeason.effectiveness || (s.effectiveness === bestSeason.effectiveness && s.pj >= bestSeason.pj)) bestSeason = s;
    if (!worstSeason || s.effectiveness < worstSeason.effectiveness || (s.effectiveness === worstSeason.effectiveness && s.pj >= worstSeason.pj)) worstSeason = s;
  }
  if (bestSeason && worstSeason && bestSeason.season === worstSeason.season) worstSeason = null;
  let busiest: { season: number; pj: number } | null = null;
  for (const s of seasons) if (!busiest || s.pj >= busiest.pj) busiest = { season: s.season, pj: s.pj };
  return {
    longestWin: longestStreak(mine, clubId, (o) => o === "G"),
    longestUnbeaten: longestStreak(mine, clubId, (o) => o !== "P"),
    longestWinless: longestStreak(mine, clubId, (o) => o !== "G"),
    seasonsInARow,
    bestSeason,
    worstSeason,
    busiestSeason: busiest,
  };
}

export function buildInsights(
  attended: AttendedMatch[],
  clubMatches: Match[],
  clubId: string,
  opts: InsightsOptions = {},
): Insights {
  const mine = playedOf(attended, clubId, opts.today);
  const clubPlayed = playedOf([...clubMatches, ...mine], clubId, opts.today);
  const attendedIds = new Set(attended.filter((m) => involves(m, clubId)).map((m) => m.id));

  const seasons = seasonsOf(mine, clubPlayed, clubId);
  const form = formOf(mine, clubId);
  const rivals = rivalsOf(mine, clubPlayed, clubId);
  const competitions = competitionsOf(mine, clubId);
  const phases = phasesOf(mine, clubId);
  const distributions = distributionsOf(mine, seasons);
  const goals = goalsOf(mine, clubId);
  const missed = missedOf(attendedIds, mine, clubPlayed, clubId);
  const records = recordsOf(mine, seasons, clubId);

  const insights: Insights = {
    played: mine.length,
    seasons,
    form,
    rivals,
    competitions,
    phases,
    distributions,
    goals,
    missed,
    records,
    highlights: [],
  };
  insights.highlights = buildHighlights(insights, mine, clubId, clubNameFrom(mine.length ? mine : clubMatches, clubId));
  return insights;
}
