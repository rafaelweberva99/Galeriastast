/**
 * Récords de un club a partir de sus partidos (rachas, valla invicta, local invicto y mayor goleada).
 * Función pura: recibe los partidos del club en la competición que se quiera medir.
 */
import { involves, isPlayed } from "./stats.ts";
import type { Match } from "./types.ts";

export interface Streak {
  length: number;
  from: string | null;
  to: string | null;
}

export interface BigWin {
  goalsFor: number;
  goalsAgainst: number;
  rival: string;
  date: string;
  tournament: string | null;
}

export interface ClubRecords {
  played: number;
  unbeaten: Streak;
  wins: Streak;
  cleanSheets: Streak;
  homeUnbeaten: Streak;
  biggestWin: BigWin | null;
}

const NONE: Streak = { length: 0, from: null, to: null };

function longest(ms: Match[], ok: (m: Match) => boolean): Streak {
  let best: Streak = NONE;
  let cur = 0;
  let start: string | null = null;
  for (const m of ms) {
    if (ok(m)) {
      if (cur === 0) start = m.date;
      cur++;
      if (cur > best.length) best = { length: cur, from: start, to: m.date };
    } else cur = 0;
  }
  return best;
}

export function clubRecords(all: Match[], clubId: string): ClubRecords {
  const ms = all.filter((m) => involves(m, clubId) && isPlayed(m)).sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  const gfOf = (m: Match) => (m.homeTeamId === clubId ? m.homeGoals! : m.awayGoals!);
  const gaOf = (m: Match) => (m.homeTeamId === clubId ? m.awayGoals! : m.homeGoals!);
  const homes = ms.filter((m) => m.homeTeamId === clubId);
  let big: Match | null = null;
  for (const m of ms) {
    const d = gfOf(m) - gaOf(m);
    if (d > 0 && (!big || d > gfOf(big) - gaOf(big) || (d === gfOf(big) - gaOf(big) && gfOf(m) > gfOf(big)))) big = m;
  }
  return {
    played: ms.length,
    unbeaten: longest(ms, (m) => gfOf(m) >= gaOf(m)),
    wins: longest(ms, (m) => gfOf(m) > gaOf(m)),
    cleanSheets: longest(ms, (m) => gaOf(m) === 0),
    homeUnbeaten: longest(homes, (m) => gfOf(m) >= gaOf(m)),
    biggestWin: big
      ? {
          goalsFor: gfOf(big),
          goalsAgainst: gaOf(big),
          rival: big.homeTeamId === clubId ? big.awayTeamName : big.homeTeamName,
          date: big.date,
          tournament: big.tournament,
        }
      : null,
  };
}
