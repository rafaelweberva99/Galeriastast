/**
 * "Suma" de dos clubes: el hincha que sigue a un club y además va al estadio de otro.
 * Un partido entre sus dos clubes cuenta una sola vez, desde la perspectiva de su club principal.
 */
import { scorersSeen, type ScorerTally } from "./scorers.ts";
import { effectiveness, involves, isPlayed, recordFor, verdict, type Verdict } from "./stats.ts";
import type { AttendedMatch, Goal, TeamRecord } from "./types.ts";

export interface SumaClub {
  clubId: string;
  total: number;
  record: TeamRecord;
  effectiveness: number | null;
  idol: ScorerTally | null;
}

export interface Suma {
  total: number;
  record: TeamRecord;
  effectiveness: number | null;
  verdict: Verdict;
  clubs: SumaClub[];
}

const addRecords = (a: TeamRecord, b: TeamRecord): TeamRecord => ({
  played: a.played + b.played,
  won: a.won + b.won,
  drawn: a.drawn + b.drawn,
  lost: a.lost + b.lost,
  goalsFor: a.goalsFor + b.goalsFor,
  goalsAgainst: a.goalsAgainst + b.goalsAgainst,
});

export function buildSuma(attended: AttendedMatch[], mainId: string, secondId: string, goals: Map<string, Goal[]>): Suma {
  const ofMain = attended.filter((m) => involves(m, mainId));
  const ofSecond = attended.filter((m) => involves(m, secondId));
  // Sin repetir el partido entre ambos clubes: se cuenta con el club principal.
  const secondOnly = ofSecond.filter((m) => !involves(m, mainId));
  const mainRec = recordFor(ofMain.filter(isPlayed), mainId);
  const secondRec = recordFor(secondOnly.filter(isPlayed), secondId);
  const record = addRecords(mainRec, secondRec);
  const club = (clubId: string, ms: AttendedMatch[]): SumaClub => {
    const played = ms.filter(isPlayed);
    const rec = recordFor(played, clubId);
    return { clubId, total: ms.length, record: rec, effectiveness: effectiveness(rec), idol: scorersSeen(ms, goals, clubId).idols[0] ?? null };
  };
  return {
    total: ofMain.length + secondOnly.length,
    record,
    effectiveness: effectiveness(record),
    verdict: verdict(record),
    clubs: [club(mainId, ofMain), club(secondId, ofSecond)],
  };
}
