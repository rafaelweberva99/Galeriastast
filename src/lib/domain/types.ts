export type Outcome = "G" | "E" | "P"; // ganado, empatado, perdido

export type AttendanceMode = "propia" | "infiltrado";

export interface Match {
  id: string;
  date: string;
  season: number;
  competitionId: string;
  competitionName: string;
  competitionKind: "liga" | "copa" | "internacional" | "supercopa";
  tournament: string | null;
  stage: string | null;
  homeTeamId: string;
  homeTeamName: string;
  awayTeamId: string;
  awayTeamName: string;
  homeGoals: number | null;
  awayGoals: number | null;
  homePens: number | null;
  awayPens: number | null;
  venueName: string | null;
  isFinal: boolean;
}

export interface AttendedMatch extends Match {
  mode: AttendanceMode;
}

export interface Rivalry {
  id: string;
  name: string;
  teamA: string;
  teamB: string;
}

export interface TeamRecord {
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
}
