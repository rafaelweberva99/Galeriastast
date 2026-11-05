/**
 * Contrato de las estadísticas avanzadas del carnet ("insights").
 *
 * Quien implementa (src/lib/domain/insights/*.ts) y quien muestra (componentes del carnet, página de resumen anual,
 * estadísticas de la comunidad) trabajan contra ESTOS tipos. Son datos puros: sin base de datos, sin React.
 * Convenciones: `effectiveness` va de 0 a 1 (puntos ganados / puntos posibles, G=3, E=1); las fechas son ISO (AAAA-MM-DD);
 * una muestra chica (menos de 3 partidos) no debe dar un veredicto: usa "poca-muestra".
 */
import type { Match } from "../types.ts";

export type Outcome = "G" | "E" | "P";

/** Partidos, resultados y goles de un grupo de partidos vistos. */
export interface Record3 {
  pj: number;
  g: number;
  e: number;
  p: number;
  gf: number;
  gc: number;
}

/** Un registro más la efectividad (0 a 1). */
export interface Rated extends Record3 {
  effectiveness: number;
}

/** Una temporada del hincha, comparada con todo el club ese año. */
export interface SeasonInsight extends Rated {
  season: number;
  /** Efectividad del club en TODOS sus partidos de esa temporada (null si no hay datos). */
  clubEffectiveness: number | null;
  /** effectiveness - clubEffectiveness, en puntos porcentuales (+ = el club rinde más cuando vas). */
  delta: number | null;
}

/** Un punto de la curva de forma: un partido visto, en orden cronológico. */
export interface FormPoint {
  matchId: string;
  date: string;
  label: string; // "U. de Chile 2-1 Palestino"
  outcome: Outcome;
  /** Efectividad acumulada hasta este partido (0 a 1). */
  cumulative: number;
  /** Efectividad de los últimos 10 partidos vistos (null hasta tener 10). */
  rolling10: number | null;
}

export type Verdict = "cabala" | "neutro" | "yeta" | "poca-muestra";

/** Cómo le va al club contra un rival cuando el hincha estuvo. */
export interface RivalInsight extends Rated {
  rivalId: string;
  rivalName: string;
  /** Efectividad histórica del club contra ese rival (todos los partidos de la base), para comparar. */
  clubEffectiveness: number | null;
  verdict: Verdict;
  lastMatchId: string;
}

export interface CompetitionInsight extends Rated {
  competitionId: string;
  name: string;
  home: Record3;
  away: Record3;
}

export type PhaseKind = "liga" | "grupos" | "eliminatoria" | "final" | "otro";

export interface PhaseInsight extends Rated {
  phase: PhaseKind;
}

export interface Distributions {
  /** Partidos vistos por mes (índice 0 = enero). */
  byMonth: number[];
  /** Partidos vistos por día de la semana (índice 0 = domingo). */
  byWeekday: number[];
  /** Partidos vistos por temporada. */
  bySeason: { season: number; pj: number }[];
}

export interface GoalInsights {
  /** Promedios por partido visto (solo partidos jugados). */
  forPerMatch: number;
  againstPerMatch: number;
  /** Partidos sin goles (0-0), con valla invicta y goleadas (diferencia de 3 o más) a favor y en contra. */
  goalless: number;
  cleanSheets: number;
  bigWins: number;
  bigLosses: number;
  highestScoring: Match | null;
  /** Tandas de penales vistas. */
  shootouts: { pj: number; won: number; lost: number };
}

/** Lo que pasó con el club cuando el hincha NO fue (en las temporadas en que sí fue a algún partido). */
export interface MissedInsights {
  missed: number;
  withYou: Rated;
  without: Rated;
  biggestWinMissed: Match | null;
  biggestLossMissed: Match | null;
  finalsMissed: Match[];
}

export interface StreakInfo {
  length: number;
  from: string;
  to: string;
}

export interface Records {
  longestWin: StreakInfo | null;
  longestUnbeaten: StreakInfo | null;
  longestWinless: StreakInfo | null;
  /** Mayor racha de temporadas seguidas yendo al estadio. */
  seasonsInARow: number;
  bestSeason: SeasonInsight | null;
  worstSeason: SeasonInsight | null;
  /** Temporada con más partidos vistos. */
  busiestSeason: { season: number; pj: number } | null;
}

/** Frase destacada, lista para mostrar ("Contra Colo-Colo eres yeta: 1 victoria en 6"). */
export interface Highlight {
  id: string;
  tone: "good" | "bad" | "fun" | "neutral";
  title: string;
  text: string;
  /** 0 a 100: orden de importancia (las más sorprendentes primero). */
  weight: number;
  matchIds: string[];
}

export interface Insights {
  /** Partidos jugados considerados (los marcados con resultado). */
  played: number;
  seasons: SeasonInsight[];
  form: FormPoint[];
  rivals: RivalInsight[];
  competitions: CompetitionInsight[];
  phases: PhaseInsight[];
  distributions: Distributions;
  goals: GoalInsights;
  missed: MissedInsights | null;
  records: Records;
  highlights: Highlight[];
}
