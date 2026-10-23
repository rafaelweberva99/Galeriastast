import type { AttendedMatch, Match } from "../src/lib/domain/types.ts";

let n = 0;
export function match(p: Partial<Match> & Pick<Match, "homeTeamId" | "awayTeamId">): Match {
  n++;
  return {
    id: `m${n}`,
    date: `2024-01-${String((n % 28) + 1).padStart(2, "0")}`,
    season: 2024,
    competitionId: "primera-division",
    competitionName: "Primera División",
    competitionKind: "liga",
    tournament: null,
    stage: null,
    homeTeamName: p.homeTeamId,
    awayTeamName: p.awayTeamId,
    homeGoals: 0,
    awayGoals: 0,
    homePens: null,
    awayPens: null,
    venueName: null,
    isFinal: false,
    ...p,
  };
}

export function attended(m: Match, mode: AttendedMatch["mode"] = "propia"): AttendedMatch {
  return { ...m, mode };
}
