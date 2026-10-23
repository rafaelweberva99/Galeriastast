import type { AttendedMatch, Match, Outcome, Rivalry, TeamRecord } from "./types.ts";

export const MIN_MATCHES_FOR_VERDICT = 5;

export function emptyRecord(): TeamRecord {
  return { played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0 };
}

export function isPlayed(m: Match): boolean {
  return m.homeGoals !== null && m.awayGoals !== null;
}

export function involves(m: Match, teamId: string): boolean {
  return m.homeTeamId === teamId || m.awayTeamId === teamId;
}

/**
 * Resultado del partido desde la óptica de `teamId`.
 * Una definición por penales cuenta como empate para la efectividad
 * (criterio estadístico estándar); ver `decidedOutcome` para finales.
 */
export function outcomeFor(m: Match, teamId: string): Outcome | null {
  if (!isPlayed(m) || !involves(m, teamId)) return null;
  const [gf, ga] = goalsFor(m, teamId);
  return gf > ga ? "G" : gf < ga ? "P" : "E";
}

/** Igual que outcomeFor, pero los penales definen ganador (útil para finales / títulos). */
export function decidedOutcome(m: Match, teamId: string): Outcome | null {
  const base = outcomeFor(m, teamId);
  if (base !== "E" || m.homePens === null || m.awayPens === null) return base;
  const home = m.homeTeamId === teamId;
  const pf = home ? m.homePens : m.awayPens;
  const pa = home ? m.awayPens : m.homePens;
  return pf > pa ? "G" : pf < pa ? "P" : "E";
}

function goalsFor(m: Match, teamId: string): [number, number] {
  const home = m.homeTeamId === teamId;
  return home ? [m.homeGoals!, m.awayGoals!] : [m.awayGoals!, m.homeGoals!];
}

export function recordFor(matches: Match[], teamId: string): TeamRecord {
  const r = emptyRecord();
  for (const m of matches) {
    const o = outcomeFor(m, teamId);
    if (!o) continue;
    const [gf, ga] = goalsFor(m, teamId);
    r.played++;
    r.goalsFor += gf;
    r.goalsAgainst += ga;
    if (o === "G") r.won++;
    else if (o === "E") r.drawn++;
    else r.lost++;
  }
  return r;
}

/** Efectividad = puntos obtenidos / puntos en disputa, en %. */
export function effectiveness(r: TeamRecord): number | null {
  if (r.played === 0) return null;
  return ((r.won * 3 + r.drawn) / (r.played * 3)) * 100;
}

export type VerdictKey = "sin-datos" | "cabala-absoluta" | "cabala" | "neutral" | "yeta" | "yeta-total";

export interface Verdict {
  key: VerdictKey;
  label: string;
  description: string;
}

const VERDICTS: Record<VerdictKey, Omit<Verdict, "key">> = {
  "sin-datos": {
    label: "Sin veredicto",
    description: `Marca al menos ${MIN_MATCHES_FOR_VERDICT} partidos para saber si eres cábala o yeta.`,
  },
  "cabala-absoluta": { label: "Cábala absoluta", description: "Tu club casi no pierde cuando vas. Te deberían pagar la entrada." },
  cabala: { label: "Cábala", description: "Más de 60% de efectividad cuando estás en la galería." },
  neutral: { label: "Hincha neutro", description: "Entre 40% y 60%: ni suerte ni mala pata." },
  yeta: { label: "Yeta", description: "Menos de 40% de efectividad cuando vas. Ojo." },
  "yeta-total": { label: "Yeta total", description: "Menos de 25%. Hay hinchas que te pagarían para que no vayas." },
};

/** Umbrales del Mufómetro: >60% cábala, <40% yeta (mismo criterio que TribunaStats). */
export function verdict(r: TeamRecord): Verdict {
  const eff = effectiveness(r);
  let key: VerdictKey;
  if (eff === null || r.played < MIN_MATCHES_FOR_VERDICT) key = "sin-datos";
  else if (eff >= 75) key = "cabala-absoluta";
  else if (eff > 60) key = "cabala";
  else if (eff >= 40) key = "neutral";
  else if (eff >= 25) key = "yeta";
  else key = "yeta-total";
  return { key, ...VERDICTS[key] };
}

export interface Streaks {
  longestWin: number;
  longestUnbeaten: number;
  longestWinless: number;
  current: { outcome: Outcome; length: number } | null;
}

export function streaks(matches: Match[], teamId: string): Streaks {
  const outcomes = [...matches]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((m) => outcomeFor(m, teamId))
    .filter((o): o is Outcome => o !== null);
  const longest = (pred: (o: Outcome) => boolean) => {
    let best = 0;
    let run = 0;
    for (const o of outcomes) {
      run = pred(o) ? run + 1 : 0;
      best = Math.max(best, run);
    }
    return best;
  };
  let current: Streaks["current"] = null;
  if (outcomes.length) {
    const last = outcomes[outcomes.length - 1];
    let length = 0;
    for (let i = outcomes.length - 1; i >= 0 && outcomes[i] === last; i--) length++;
    current = { outcome: last, length };
  }
  return {
    longestWin: longest((o) => o === "G"),
    longestUnbeaten: longest((o) => o !== "P"),
    longestWinless: longest((o) => o !== "G"),
    current,
  };
}

export interface Breakdown {
  key: string;
  label: string;
  record: TeamRecord;
  effectiveness: number | null;
}

function breakdown(matches: Match[], teamId: string, keyOf: (m: Match) => [string, string]): Breakdown[] {
  const groups = new Map<string, { label: string; matches: Match[] }>();
  for (const m of matches) {
    const [key, label] = keyOf(m);
    const g = groups.get(key) ?? { label, matches: [] };
    g.matches.push(m);
    groups.set(key, g);
  }
  return [...groups.entries()].map(([key, g]) => {
    const record = recordFor(g.matches, teamId);
    return { key, label: g.label, record, effectiveness: effectiveness(record) };
  });
}

export interface RivalryStats {
  rivalry: Rivalry;
  record: TeamRecord;
  effectiveness: number | null;
}

export interface FinalResult {
  match: AttendedMatch;
  outcome: Outcome | null;
}

export interface Carnet {
  clubId: string;
  total: number;
  record: TeamRecord;
  effectiveness: number | null;
  verdict: Verdict;
  /** Efectividad del club en todos sus partidos de las temporadas en que el hincha fue. */
  baselineEffectiveness: number | null;
  /** Diferencia en puntos porcentuales entre la efectividad con el hincha y la base del club. */
  impact: number | null;
  home: TeamRecord;
  away: TeamRecord;
  infiltrado: TeamRecord;
  streaks: Streaks;
  bySeason: Breakdown[];
  byCompetition: Breakdown[];
  byVenue: Breakdown[];
  byOpponent: Breakdown[];
  classics: RivalryStats[];
  finals: FinalResult[];
  biggestWin: AttendedMatch | null;
  worstDefeat: AttendedMatch | null;
  first: AttendedMatch | null;
  last: AttendedMatch | null;
}

/**
 * Construye el "carnet de hincha": todas las estadísticas personales del hincha
 * a partir de los partidos a los que fue (solo partidos de su club).
 * `clubMatches` son todos los partidos del club (para calcular la base de comparación).
 */
export function buildCarnet(
  attended: AttendedMatch[],
  clubId: string,
  rivalries: Rivalry[],
  clubMatches: Match[],
): Carnet {
  const mine = attended.filter((m) => involves(m, clubId)).sort((a, b) => a.date.localeCompare(b.date));
  const played = mine.filter(isPlayed);
  const record = recordFor(played, clubId);

  const seasons = new Set(played.map((m) => m.season));
  const baseline = recordFor(
    clubMatches.filter((m) => seasons.has(m.season)),
    clubId,
  );
  const eff = effectiveness(record);
  const baseEff = effectiveness(baseline);

  const opponentOf = (m: Match): [string, string] =>
    m.homeTeamId === clubId ? [m.awayTeamId, m.awayTeamName] : [m.homeTeamId, m.homeTeamName];

  const classics: RivalryStats[] = rivalries
    .filter((r) => r.teamA === clubId || r.teamB === clubId)
    .map((rivalry) => {
      const rival = rivalry.teamA === clubId ? rivalry.teamB : rivalry.teamA;
      const rec = recordFor(
        played.filter((m) => involves(m, rival)),
        clubId,
      );
      return { rivalry, record: rec, effectiveness: effectiveness(rec) };
    });

  const margin = (m: Match) => {
    const home = m.homeTeamId === clubId;
    return home ? m.homeGoals! - m.awayGoals! : m.awayGoals! - m.homeGoals!;
  };
  const byMargin = [...played].sort((a, b) => margin(b) - margin(a) || b.date.localeCompare(a.date));

  return {
    clubId,
    total: mine.length,
    record,
    effectiveness: eff,
    verdict: verdict(record),
    baselineEffectiveness: baseEff,
    impact: eff !== null && baseEff !== null ? eff - baseEff : null,
    home: recordFor(played.filter((m) => m.homeTeamId === clubId), clubId),
    away: recordFor(played.filter((m) => m.awayTeamId === clubId), clubId),
    infiltrado: recordFor(played.filter((m) => m.mode === "infiltrado"), clubId),
    streaks: streaks(played, clubId),
    bySeason: breakdown(played, clubId, (m) => [String(m.season), String(m.season)]).sort((a, b) =>
      b.key.localeCompare(a.key),
    ),
    byCompetition: breakdown(played, clubId, (m) => [m.competitionId, m.competitionName]).sort(
      (a, b) => b.record.played - a.record.played,
    ),
    byVenue: breakdown(played, clubId, (m) => [m.venueName ?? "?", m.venueName ?? "Estadio sin registrar"]).sort(
      (a, b) => b.record.played - a.record.played,
    ),
    byOpponent: breakdown(played, clubId, opponentOf).sort((a, b) => b.record.played - a.record.played),
    classics,
    finals: mine.filter((m) => m.isFinal).map((match) => ({ match, outcome: decidedOutcome(match, clubId) })),
    biggestWin: byMargin.length && margin(byMargin[0]) > 0 ? byMargin[0] : null,
    worstDefeat: byMargin.length && margin(byMargin[byMargin.length - 1]) < 0 ? byMargin[byMargin.length - 1] : null,
    first: mine[0] ?? null,
    last: mine[mine.length - 1] ?? null,
  };
}
