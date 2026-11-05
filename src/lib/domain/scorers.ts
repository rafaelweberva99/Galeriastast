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
  /** Goles que pesaron más para el hincha: en victorias de su club (ídolos) o en derrotas (verdugos). */
  decisive: number;
  /** Fecha del último partido en que marcó (desempate: el más reciente). */
  lastDate: string;
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

/** Qué pasó con el club del hincha en cada partido visto: sirve para desempatar ídolos y verdugos. */
interface MatchMeta {
  date: string;
  /** Diferencia de goles desde el punto de vista del club del hincha. */
  margin: number;
}

function tally(entries: { goal: Goal; scorerTeam: string }[], meta: Map<string, MatchMeta>, decisiveWhen: "win" | "loss"): ScorerTally[] {
  const by = new Map<string, { t: ScorerTally; perMatch: Map<string, number> }>();
  for (const { goal, scorerTeam } of entries) {
    const key = `${goal.player}|${scorerTeam}`;
    const e = by.get(key) ?? {
      t: { player: goal.player, teamId: scorerTeam, goals: 0, penalties: 0, matches: 0, hatTricks: 0, decisive: 0, lastDate: "" },
      perMatch: new Map<string, number>(),
    };
    const m = meta.get(goal.matchId);
    e.t.goals++;
    if (goal.penalty) e.t.penalties++;
    if (m && (decisiveWhen === "win" ? m.margin > 0 : m.margin < 0)) e.t.decisive++;
    if (m && m.date > e.t.lastDate) e.t.lastDate = m.date;
    e.perMatch.set(goal.matchId, (e.perMatch.get(goal.matchId) ?? 0) + 1);
    by.set(key, e);
  }
  // Primero goles y hat-tricks; si siguen empatados pesa lo que más le dolió (o alegró) al hincha, luego en cuántos
  // partidos marcó y el más reciente. El nombre solo desempata al final, para que el orden sea estable.
  return [...by.values()]
    .map(({ t, perMatch }) => ({
      ...t,
      matches: perMatch.size,
      hatTricks: [...perMatch.values()].filter((n) => n >= 3).length,
    }))
    .sort(
      (a, b) =>
        b.goals - a.goals ||
        b.hatTricks - a.hatTricks ||
        b.decisive - a.decisive ||
        b.matches - a.matches ||
        b.lastDate.localeCompare(a.lastDate) ||
        a.player.localeCompare(b.player, "es"),
    );
}

/** Cuántos jugadores igualan al primero en goles, hat-tricks, goles decisivos y partidos (solo los separa el más reciente). */
export function tiedWithFirst(rows: ScorerTally[]): number {
  const [first, ...rest] = rows;
  if (!first) return 0;
  const same = (r: ScorerTally) =>
    r.goals === first.goals && r.hatTricks === first.hatTricks && r.decisive === first.decisive && r.matches === first.matches;
  return rest.filter(same).length;
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
  const meta = new Map<string, MatchMeta>();
  let matchesWithGoals = 0;
  let goalsFor = 0;
  let goalsAgainst = 0;

  for (const m of played) {
    // Solo cuentan los partidos con lista de goles cargada (un 0-0 sin lista no es "dato").
    const goals = goalsByMatch.get(m.id);
    if (!goals || !goalsComplete(m, goals)) continue;
    matchesWithGoals++;
    const mine = m.homeTeamId === clubId ? m.homeGoals : m.awayGoals;
    const theirs = m.homeTeamId === clubId ? m.awayGoals : m.homeGoals;
    meta.set(m.id, { date: m.date, margin: (mine ?? 0) - (theirs ?? 0) });
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
    idols: tally(forEntries, meta, "win"),
    executioners: tally(againstEntries, meta, "loss"),
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
