/**
 * Lógica pura de la página de un partido: fase, título, cobertura de goles, historial entre dos equipos
 * y resumen de la hinchada (con la regla de privacidad k ≥ 5). Nada de base de datos aquí.
 */
import type { Goal, Match, Outcome } from "./types.ts";
import { fanEffectiveness, type FanLine, mean, MIN_COMMUNITY_FANS, privacyGate } from "./community.ts";

export type MatchPhase = "futuro" | "jugado" | "suspendido";

const hasScore = (m: Pick<Match, "homeGoals" | "awayGoals">) => m.homeGoals !== null && m.awayGoals !== null;

/** Futuro = hoy o después y sin marcador; suspendido = ya pasó, sin marcador ni penales. */
export function matchPhase(m: Pick<Match, "date" | "homeGoals" | "awayGoals" | "homePens">, today: string): MatchPhase {
  if (hasScore(m)) return "jugado";
  if (m.date >= today) return "futuro";
  return m.homePens !== null ? "jugado" : "suspendido";
}

/** Días de calendario entre dos fechas ISO (0 = hoy). */
export function daysUntil(date: string, today: string): number {
  return Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
}

export function countdownText(days: number): string {
  if (days <= 0) return "Es hoy";
  if (days === 1) return "Es mañana";
  return `Faltan ${days} días`;
}

/** Temporada para mostrar en el título: la del campeonato ("2025"). */
export function matchTitle(m: Match, home: string, away: string): string {
  const score = hasScore(m) ? ` ${m.homeGoals}-${m.awayGoals} ` : " vs ";
  return `${home}${score}${away} · ${m.competitionName} ${m.season}`;
}

export function matchDescription(m: Match, home: string, away: string, phase: MatchPhase): string {
  const when = `${m.date}`;
  if (phase === "futuro") return `Próximo partido: ${home} vs ${away} (${m.competitionName}, ${when}). Mira la historia entre ambos y qué dice la hinchada.`;
  if (phase === "suspendido") return `${home} vs ${away} (${m.competitionName}, ${when}): partido suspendido. Historial entre ambos y la hinchada.`;
  const pens = m.homePens !== null ? ` (${m.homePens}-${m.awayPens} en penales)` : "";
  return `${home} ${m.homeGoals}-${m.awayGoals} ${away}${pens}, ${m.competitionName} ${when}. Goles, historial entre ambos y lo que dice la hinchada.`;
}

export type GoalCoverage = "completa" | "parcial" | "ninguna";

/** Un gol suma al equipo `teamId` aunque sea autogol; la lista es completa si coincide con el marcador. */
export function goalCoverage(m: Match, goals: Goal[]): GoalCoverage {
  if (!hasScore(m)) return "ninguna";
  const total = m.homeGoals! + m.awayGoals!;
  if (total === 0) return "completa";
  if (goals.length === 0) return "ninguna";
  const home = goals.filter((g) => g.teamId === m.homeTeamId).length;
  const away = goals.filter((g) => g.teamId === m.awayTeamId).length;
  return home === m.homeGoals && away === m.awayGoals ? "completa" : "parcial";
}

/** Goles de un equipo ordenados por minuto (los sin minuto, al final). */
export function goalsOf(goals: Goal[], teamId: string): Goal[] {
  return goals.filter((g) => g.teamId === teamId).sort((a, b) => (a.minute ?? 999) - (b.minute ?? 999));
}

// ---------- historial entre dos equipos ----------

export type H2HMatch = Pick<
  Match,
  "id" | "date" | "homeTeamId" | "awayTeamId" | "homeGoals" | "awayGoals" | "homePens" | "awayPens" | "competitionName" | "season"
>;

export interface HeadToHead {
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  /** Últimos enfrentamientos jugados (más reciente primero), sin contar el partido actual. */
  last: (H2HMatch & { outcome: Outcome })[];
}

/** Historial visto desde `teamId` (G-E-P). Ignora partidos sin marcador y el partido `excludeId`. */
export function headToHead(rows: H2HMatch[], teamId: string, excludeId: string, limit = 5): HeadToHead {
  const played = rows
    .filter((m) => m.id !== excludeId && m.homeGoals !== null && m.awayGoals !== null)
    .sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
  const out: HeadToHead = { played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, last: [] };
  for (const m of played) {
    const home = m.homeTeamId === teamId;
    const gf = home ? m.homeGoals! : m.awayGoals!;
    const ga = home ? m.awayGoals! : m.homeGoals!;
    const outcome: Outcome = gf > ga ? "G" : gf < ga ? "P" : "E";
    out.played++;
    out.goalsFor += gf;
    out.goalsAgainst += ga;
    if (outcome === "G") out.won++;
    else if (outcome === "P") out.lost++;
    else out.drawn++;
    if (out.last.length < limit) out.last.push({ ...m, outcome });
  }
  return out;
}

// ---------- la hinchada en el partido ----------

/** Un hincha público que marcó el partido, con el historial de su club. */
export interface CrowdFan extends FanLine {
  clubId: string;
}

export interface CrowdClubShare {
  clubId: string;
  fans: number;
  pct: number;
  /** Efectividad media de los que fueron (de los con veredicto); null si hay menos de 5 con veredicto. */
  effectiveness: number | null;
}

export interface CrowdSummary {
  fans: number;
  /** Clubes con al menos 5 hinchas, de más a menos. */
  clubs: CrowdClubShare[];
  /** Hinchas de clubes con menos de 5 marcas: se agrupan para no identificar a nadie. */
  others: { fans: number; pct: number } | null;
}

/** null si hay menos de 5 hinchas públicos detrás (no se muestra nada). */
export function summarizeCrowd(fans: CrowdFan[]): CrowdSummary | null {
  if (privacyGate(fans.length, true) === null) return null;
  const byClub = new Map<string, CrowdFan[]>();
  for (const f of fans) byClub.set(f.clubId, [...(byClub.get(f.clubId) ?? []), f]);
  const share = (n: number) => Math.round((n / fans.length) * 100);
  const big = [...byClub].filter(([, l]) => l.length >= MIN_COMMUNITY_FANS);
  const smallCount = [...byClub].filter(([, l]) => l.length < MIN_COMMUNITY_FANS).reduce((s, [, l]) => s + l.length, 0);
  const clubs = big
    .map(([clubId, list]) => {
      const effs = list.map(fanEffectiveness).filter((e): e is number => e !== null);
      return { clubId, fans: list.length, pct: share(list.length), effectiveness: privacyGate(effs.length, mean(effs)) };
    })
    .sort((a, b) => b.fans - a.fans || a.clubId.localeCompare(b.clubId));
  return { fans: fans.length, clubs, // "Otros" se calcula por resto para que la suma dé 100.
    others: smallCount > 0 ? { fans: smallCount, pct: 100 - clubs.reduce((t, c) => t + c.pct, 0) } : null };
}
