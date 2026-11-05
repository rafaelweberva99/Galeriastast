/**
 * "Comparar con un amigo": enfrenta dos carnets cara a cara. Lógica pura (sin base de datos ni React).
 * Todo sale de lo que ya calculan buildCarnet / buildInsights / scorersSeen: aquí solo se ponen lado a lado.
 */
import { MIN_MATCHES_FOR_VERDICT, isPlayed, outcomeFor } from "./stats.ts";
import type { Carnet } from "./stats.ts";
import type { Insights } from "./insights/types.ts";
import type { ScorersReport } from "./scorers.ts";
import { tierFor } from "./achievements.ts";
import type { Match, Outcome } from "./types.ts";

/** Diferencia (en puntos de efectividad) bajo la cual se habla de empate técnico. */
export const TIE_POINTS = 2;
/** Desde esta diferencia la cosa es "aplastante" / "ventaja clara". */
export const CRUSH_POINTS = 25;
export const CLEAR_POINTS = 10;

export interface SideIdol {
  player: string;
  goals: number;
  teamId: string;
}

/** Un hincha reducido a lo que se compara. Sin correos ni datos privados. */
export interface FanSide {
  username: string;
  memberId: number;
  clubId: string;
  clubName: string;
  clubShort: string;
  /** Partidos de su club en la galería. */
  total: number;
  /** Partidos jugados (con resultado). */
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  /** 0 a 100, o null si no tiene partidos jugados. */
  effectiveness: number | null;
  tierLabel: string;
  verdictLabel: string;
  verdictKey: Carnet["verdict"]["key"];
  longestUnbeaten: number;
  bestSeason: { season: number; effectiveness: number; pj: number } | null;
  finals: number;
  classics: number;
  seasons: number;
  sinceYear: number | null;
  idol: SideIdol | null;
  executioner: SideIdol | null;
}

export function buildSide(input: {
  username: string;
  memberId: number;
  club: { id: string; name: string; shortName: string };
  carnet: Carnet;
  insights: Insights;
  scorers: ScorersReport;
}): FanSide {
  const { carnet: c, insights: ins, scorers } = input;
  const best = ins.records.bestSeason;
  const idol = scorers.idols[0];
  const exe = scorers.executioners[0];
  return {
    username: input.username,
    memberId: input.memberId,
    clubId: input.club.id,
    clubName: input.club.name,
    clubShort: input.club.shortName,
    total: c.total,
    played: c.record.played,
    won: c.record.won,
    drawn: c.record.drawn,
    lost: c.record.lost,
    goalsFor: c.record.goalsFor,
    goalsAgainst: c.record.goalsAgainst,
    effectiveness: c.effectiveness,
    tierLabel: tierFor(c.total).label,
    verdictLabel: c.verdict.label,
    verdictKey: c.verdict.key,
    longestUnbeaten: ins.records.longestUnbeaten?.length ?? 0,
    bestSeason: best ? { season: best.season, effectiveness: best.effectiveness * 100, pj: best.pj } : null,
    finals: c.finals.length,
    classics: c.classics.reduce((n, k) => n + k.record.played, 0),
    seasons: ins.seasons.length,
    sinceYear: c.first ? Number(c.first.date.slice(0, 4)) : null,
    idol: idol ? { player: idol.player, goals: idol.goals, teamId: idol.teamId } : null,
    executioner: exe ? { player: exe.player, goals: exe.goals, teamId: exe.teamId } : null,
  };
}

// --- Tabla cara a cara -----------------------------------------------------------

export type Winner = "a" | "b" | "empate" | null;

export interface DuelRow {
  key: string;
  label: string;
  a: string;
  b: string;
  /** null = fila informativa, sin ganador. */
  winner: Winner;
}

/** Quién gana según el criterio: "alto" = el mayor, "bajo" = el menor, null = nadie. */
export function pickWinner(a: number | null, b: number | null, better: "alto" | "bajo" | null): Winner {
  if (better === null || a === null || b === null) return null;
  if (a === b) return "empate";
  return (a > b) === (better === "alto") ? "a" : "b";
}

const dash = "—";
const pct0 = (v: number | null) => (v === null ? dash : `${Math.round(v)}%`);

export function duelRows(a: FanSide, b: FanSide): DuelRow[] {
  const row = (
    key: string,
    label: string,
    va: number | null,
    vb: number | null,
    better: "alto" | "bajo" | null,
    fmt: (n: number | null) => string = (n) => (n === null ? dash : String(n)),
  ): DuelRow => ({ key, label, a: fmt(va), b: fmt(vb), winner: pickWinner(va, vb, better) });
  const eff = (s: FanSide) => (s.effectiveness === null ? null : Math.round(s.effectiveness));
  const best = (s: FanSide) => (s.bestSeason ? Math.round(s.bestSeason.effectiveness) : null);
  const bestFmt = (s: FanSide) => (s.bestSeason ? `${Math.round(s.bestSeason.effectiveness)}% (${s.bestSeason.season})` : dash);
  const gep = (s: FanSide) => (s.played ? `${s.won}-${s.drawn}-${s.lost}` : dash);
  return [
    row("total", "Partidos en la galería", a.total, b.total, "alto"),
    row("eff", "Efectividad", eff(a), eff(b), "alto", pct0),
    { key: "gep", label: "Ganados-empatados-perdidos", a: gep(a), b: gep(b), winner: null },
    row("gf", "Goles vistos a favor", a.played ? a.goalsFor : null, b.played ? b.goalsFor : null, "alto"),
    row("gc", "Goles vistos en contra", a.played ? a.goalsAgainst : null, b.played ? b.goalsAgainst : null, null),
    row("unbeaten", "Racha más larga invicta", a.played ? a.longestUnbeaten : null, b.played ? b.longestUnbeaten : null, "alto"),
    { key: "best", label: "Mejor temporada", a: bestFmt(a), b: bestFmt(b), winner: pickWinner(best(a), best(b), "alto") },
    row("finals", "Finales vistas", a.finals, b.finals, "alto"),
    row("classics", "Clásicos vistos", a.classics, b.classics, "alto"),
    row("seasons", "Temporadas distintas yendo", a.seasons, b.seasons, "alto"),
    row("since", "Yendo desde", a.sinceYear, b.sinceYear, "bajo"),
  ];
}

/** Cuántas filas ganó cada uno (sirve para la cabecera y el texto de compartir). */
export function rowTally(rows: DuelRow[]): { a: number; b: number } {
  return { a: rows.filter((r) => r.winner === "a").length, b: rows.filter((r) => r.winner === "b").length };
}

// --- Titular y veredicto ----------------------------------------------------------

export function headline(a: FanSide, b: FanSide): string {
  if (a.effectiveness === null || b.effectiveness === null) return "Todavía falta galería para comparar";
  const ea = Math.round(a.effectiveness);
  const eb = Math.round(b.effectiveness);
  if (ea === eb) return `Empate: los dos con ${ea}% de efectividad`;
  const [w, diff] = ea > eb ? [a, ea - eb] : [b, eb - ea];
  return `Gana @${w.username} por ${diff} ${diff === 1 ? "punto" : "puntos"} de efectividad`;
}

export type DuelVerdictKey =
  | "sin-datos"
  | "pocos-datos"
  | "cabala-vs-fiel"
  | "empate-tecnico"
  | "aplastante"
  | "ventaja-clara"
  | "gana-por-poco";

export interface DuelVerdict {
  key: DuelVerdictKey;
  title: string;
  text: string;
  /** Quién se lleva el veredicto (null si nadie). */
  winner: "a" | "b" | null;
}

/** El que tiene más partidos solo "es más fiel" si la diferencia es clara (>= 5 partidos y 20 %). */
function moreFaithful(a: FanSide, b: FanSide): "a" | "b" | null {
  const [hi, lo] = a.total >= b.total ? [a, b] : [b, a];
  if (hi.total - lo.total < 5 || hi.total < lo.total * 1.2) return null;
  return hi === a ? "a" : "b";
}

export function duelVerdict(a: FanSide, b: FanSide): DuelVerdict {
  const na = `@${a.username}`;
  const nb = `@${b.username}`;
  if (a.played === 0 || b.played === 0) {
    const who = a.played === 0 && b.played === 0 ? `${na} y ${nb} todavía no marcan` : `${a.played === 0 ? na : nb} todavía no marca`;
    return { key: "sin-datos", title: "Falta galería", text: `${who} partidos jugados. Cuando los marquen, esto se pone bueno.`, winner: null };
  }
  if (Math.min(a.played, b.played) < MIN_MATCHES_FOR_VERDICT) {
    return {
      key: "pocos-datos",
      title: "Aún es pronto",
      text: `Con menos de ${MIN_MATCHES_FOR_VERDICT} partidos el Mufómetro no sentencia a nadie. Sigan sumando galería.`,
      winner: null,
    };
  }
  const ea = Math.round(a.effectiveness!);
  const eb = Math.round(b.effectiveness!);
  const diff = Math.abs(ea - eb);
  const effWinner: "a" | "b" = ea > eb ? "a" : "b";
  if (diff < TIE_POINTS) {
    return {
      key: "empate-tecnico",
      title: "Empate técnico",
      text: `${ea}% contra ${eb}%: no hay quién los separe. Que lo defina el próximo partido.`,
      winner: null,
    };
  }
  const faithful = moreFaithful(a, b);
  if (faithful && faithful !== effWinner) {
    const [cab, fiel] = effWinner === "a" ? [a, b] : [b, a];
    return {
      key: "cabala-vs-fiel",
      title: "Más cábala vs más fiel",
      text: `@${cab.username} es más cábala (${Math.round(cab.effectiveness!)}% contra ${Math.round(fiel.effectiveness!)}%), pero @${fiel.username} es más fiel: ${fiel.total} partidos contra ${cab.total}. Cada uno con su medalla.`,
      winner: null,
    };
  }
  const w = effWinner === "a" ? a : b;
  const l = effWinner === "a" ? b : a;
  if (diff >= CRUSH_POINTS) {
    return {
      key: "aplastante",
      title: "Aplastante",
      text: `@${w.username} lo pasa por encima en el Mufómetro: ${Math.round(w.effectiveness!)}% contra ${Math.round(l.effectiveness!)}%. @${l.username} tiene revancha pendiente.`,
      winner: effWinner,
    };
  }
  if (diff >= CLEAR_POINTS) {
    return {
      key: "ventaja-clara",
      title: "Ventaja clara",
      text: `@${w.username} lleva la delantera por ${diff} puntos. @${l.username} todavía puede dar vuelta la tabla.`,
      winner: effWinner,
    };
  }
  return {
    key: "gana-por-poco",
    title: "Gana por poco",
    text: `@${w.username} se queda con el duelo por ${diff} ${diff === 1 ? "punto" : "puntos"}. Cualquier partido lo cambia.`,
    winner: effWinner,
  };
}

// --- Partidos en común -----------------------------------------------------------

export interface CommonMatch {
  match: Match;
  /** Resultado desde la óptica del club de cada uno (null si su club no jugó ese partido). */
  outcomeA: Outcome | null;
  outcomeB: Outcome | null;
  /** Diferencia de goles para el club de A (null si no aplica). */
  marginA: number | null;
}

export interface CommonSummary {
  count: number;
  /** Más reciente primero. */
  matches: CommonMatch[];
  sameClub: boolean;
  /** Solo en hinchas del mismo club: la mejor y la peor noche que vivieron juntos. */
  best: CommonMatch | null;
  worst: CommonMatch | null;
  /** Mayor diferencia de goles de los partidos en común (para clubes distintos). */
  biggest: CommonMatch | null;
  /** Solo si los dos clubes se enfrentaron en los partidos en común. */
  headToHead: { a: number; b: number; draws: number } | null;
}

function marginFor(m: Match, clubId: string): number | null {
  if (!isPlayed(m)) return null;
  if (m.homeTeamId === clubId) return m.homeGoals! - m.awayGoals!;
  if (m.awayTeamId === clubId) return m.awayGoals! - m.homeGoals!;
  return null;
}

export function commonMatches(attendedA: Match[], attendedB: Match[], clubA: string, clubB: string): CommonSummary {
  const idsB = new Set(attendedB.map((m) => m.id));
  const sameClub = clubA === clubB;
  const matches: CommonMatch[] = attendedA
    .filter((m) => idsB.has(m.id))
    .sort((x, y) => y.date.localeCompare(x.date) || x.id.localeCompare(y.id))
    .map((match) => ({
      match,
      outcomeA: outcomeFor(match, clubA),
      outcomeB: outcomeFor(match, clubB),
      marginA: marginFor(match, clubA),
    }));

  let best: CommonMatch | null = null;
  let worst: CommonMatch | null = null;
  if (sameClub) {
    const scored = matches.filter((c) => c.marginA !== null);
    // Ordenados del más reciente al más antiguo: en empate de diferencia gana el más reciente (primero que aparece).
    for (const c of scored) {
      if (best === null || c.marginA! > best.marginA!) best = c;
      if (worst === null || c.marginA! < worst.marginA!) worst = c;
    }
    if (best && best.marginA! < 0) best = null;
    if (worst && worst.marginA! > 0) worst = null;
    if (best && worst && best.match.id === worst.match.id) worst = null;
  }

  let biggest: CommonMatch | null = null;
  for (const c of matches) {
    if (!isPlayed(c.match)) continue;
    const gap = Math.abs(c.match.homeGoals! - c.match.awayGoals!);
    const cur = biggest ? Math.abs(biggest.match.homeGoals! - biggest.match.awayGoals!) : -1;
    if (gap > cur) biggest = c;
  }

  let headToHead: CommonSummary["headToHead"] = null;
  if (!sameClub) {
    const duels = matches.filter((c) => c.outcomeA !== null && c.outcomeB !== null);
    if (duels.length) {
      headToHead = {
        a: duels.filter((c) => c.outcomeA === "G").length,
        b: duels.filter((c) => c.outcomeB === "G").length,
        draws: duels.filter((c) => c.outcomeA === "E").length,
      };
    }
  }
  return { count: matches.length, matches, sameClub, best, worst, biggest, headToHead };
}

// --- Texto para compartir ---------------------------------------------------------

/** Texto de hincha para X / WhatsApp. El link va aparte (o al final, según la red). */
export function duelShareText(a: FanSide, b: FanSide): string {
  const v = duelVerdict(a, b);
  const base = `Mi Mufómetro vs el tuyo: @${a.username} (${a.clubShort}) contra @${b.username} (${b.clubShort}).`;
  if (a.effectiveness === null || b.effectiveness === null) return `${base} ¿Quién es más cábala?`;
  return `${base} ${headline(a, b)}. Veredicto: ${v.title}. ¿Te animas a compararte?`;
}

/** Ruta canónica del duelo (los dos nombres reales; nunca "yo"). */
export function duelPath(a: string, b: string): string {
  return `/comparar/${encodeURIComponent(a)}/${encodeURIComponent(b)}`;
}

/** Normaliza lo que escribe la gente: "@Pancho_Albo " -> "pancho_albo". */
export function normalizeHandle(raw: string): string {
  return raw.trim().replace(/^@+/, "").trim();
}
