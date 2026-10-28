import { involves, isPlayed } from "./stats.ts";
import type { Goal, Match } from "./types.ts";

export interface ScorerTally {
  player: string;
  /** Equipo para el que hizo los goles (en autogoles, el equipo del jugador). */
  teamId: string;
  goals: number;
  penalties: number;
  /** Partidos distintos en que marcó. */
  matches: number;
  /** Partidos con 3 o más goles del jugador. */
  hatTricks: number;
}

export interface OwnGoalSeen {
  goal: Goal;
  match: Match;
  /** true si el autogol favoreció al club del hincha. */
  inFavor: boolean;
}

export interface ScorersReport {
  /** Partidos marcados (jugados) que tienen la lista de goles completa. */
  matchesWithGoals: number;
  matchesPlayed: number;
  /** Goles de tu club que viste (incluye autogoles rivales a favor). */
  goalsFor: number;
  goalsAgainst: number;
  /** Goleadores de tu club que viste, de más a menos. */
  idols: ScorerTally[];
  /** Jugadores rivales que más goles le hicieron a tu club en partidos que viste. */
  executioners: ScorerTally[];
  ownGoals: OwnGoalSeen[];
}

function tally(entries: { goal: Goal; scorerTeam: string }[]): ScorerTally[] {
  const by = new Map<string, { t: ScorerTally; perMatch: Map<string, number> }>();
  for (const { goal, scorerTeam } of entries) {
    const key = `${goal.player}|${scorerTeam}`;
    const e = by.get(key) ?? {
      t: { player: goal.player, teamId: scorerTeam, goals: 0, penalties: 0, matches: 0, hatTricks: 0 },
      perMatch: new Map<string, number>(),
    };
    e.t.goals++;
    if (goal.penalty) e.t.penalties++;
    e.perMatch.set(goal.matchId, (e.perMatch.get(goal.matchId) ?? 0) + 1);
    by.set(key, e);
  }
  return [...by.values()]
    .map(({ t, perMatch }) => ({
      ...t,
      matches: perMatch.size,
      hatTricks: [...perMatch.values()].filter((n) => n >= 3).length,
    }))
    .sort((a, b) => b.goals - a.goals || b.hatTricks - a.hatTricks || a.player.localeCompare(b.player, "es"));
}

/** ¿La lista de goles del partido calza con el marcador? (si no, no se usa para estadísticas). */
export function goalsComplete(m: Match, goals: Goal[]): boolean {
  if (!isPlayed(m)) return false;
  const home = goals.filter((g) => g.teamId === m.homeTeamId).length;
  const away = goals.filter((g) => g.teamId === m.awayTeamId).length;
  return home === m.homeGoals && away === m.awayGoals;
}

/**
 * Goleadores vistos por el hincha en los partidos de su club a los que fue.
 * Solo se cuentan partidos cuya lista de goles cuadra con el marcador.
 */
export function scorersSeen(attended: Match[], goalsByMatch: Map<string, Goal[]>, clubId: string): ScorersReport {
  const played = attended.filter((m) => involves(m, clubId) && isPlayed(m));
  const forEntries: { goal: Goal; scorerTeam: string }[] = [];
  const againstEntries: { goal: Goal; scorerTeam: string }[] = [];
  const ownGoals: OwnGoalSeen[] = [];
  let matchesWithGoals = 0;
  let goalsFor = 0;
  let goalsAgainst = 0;

  for (const m of played) {
    // Solo cuentan los partidos con lista de goles cargada (un 0-0 sin lista no es "dato").
    const goals = goalsByMatch.get(m.id);
    if (!goals || !goalsComplete(m, goals)) continue;
    matchesWithGoals++;
    const rival = m.homeTeamId === clubId ? m.awayTeamId : m.homeTeamId;
    for (const g of goals) {
      const inFavor = g.teamId === clubId;
      if (inFavor) goalsFor++;
      else goalsAgainst++;
      if (g.ownGoal) {
        ownGoals.push({ goal: g, match: m, inFavor });
        continue;
      }
      if (inFavor) forEntries.push({ goal: g, scorerTeam: clubId });
      else againstEntries.push({ goal: g, scorerTeam: rival });
    }
  }

  return {
    matchesWithGoals,
    matchesPlayed: played.length,
    goalsFor,
    goalsAgainst,
    idols: tally(forEntries),
    executioners: tally(againstEntries),
    ownGoals: ownGoals.sort((a, b) => b.match.date.localeCompare(a.match.date)),
  };
}

/** Texto corto de los goles de un equipo: "Suazo 12', 45' (p) · Paredes 78' · Pérez (autogol) 80'". */
export function scorersLine(goals: Goal[], teamId: string): string {
  const mine = goals
    .filter((g) => g.teamId === teamId)
    .sort((a, b) => (a.minute ?? 999) - (b.minute ?? 999));
  const groups = new Map<string, Goal[]>();
  for (const g of mine) {
    const key = `${g.player}|${g.ownGoal ? 1 : 0}`;
    groups.set(key, [...(groups.get(key) ?? []), g]);
  }
  return [...groups.values()]
    .map((gs) => {
      const mins = gs.map((g) => `${g.minute !== null ? `${g.minute}'` : ""}${g.penalty ? " (p)" : ""}`.trim()).filter(Boolean);
      return `${gs[0].player}${gs[0].ownGoal ? " (autogol)" : ""}${mins.length ? ` ${mins.join(", ")}` : ""}`;
    })
    .join(" · ");
}
