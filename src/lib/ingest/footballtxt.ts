/**
 * Parser del formato Football.TXT (openfootball / yorobot cache.wfb.txt).
 *
 *   = CL 1 2005
 *   # Date       Fri Jan/21 - Thu Dec/22 2005 (335d)
 *   == Apertura
 *   Matchday 1
 *   [Fri Jan/21]
 *     17.00  Huachipato               4-1  La Serena
 *            Fernández Vial           4-2 pen. (1-1, 0-0)  Deportes Concepción
 */

export interface ParsedMatch {
  date: string; // yyyy-mm-dd
  stage: string | null; // "Apertura", "Clausura Playoffs", ...
  round: string | null; // "Matchday 3", "Final", ...
  home: string;
  away: string;
  homeGoals: number | null;
  awayGoals: number | null;
  homePens: number | null;
  awayPens: number | null;
  extraTime: boolean;
  /** Resultado decretado en mesa (walkover / sanción). */
  awarded: boolean;
  line: number;
}

export interface ParsedFile {
  title: string;
  matches: ParsedMatch[];
  /** Partidos sin resultado (suspendidos, cancelados, aún no jugados): no se pueden marcar. */
  skipped: number;
  warnings: string[];
}

const MONTHS: Record<string, number> = {
  Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12,
};

interface Score {
  homeGoals: number | null;
  awayGoals: number | null;
  homePens: number | null;
  awayPens: number | null;
  extraTime: boolean;
}

/**
 * Formatos admitidos:
 *   "4-1"   "9-1 (5-0)"   "2-1 a.e.t. (1-1, 0-0)"
 *   "2-4 pen."   "4-2 pen. (1-1, 0-0)"   "4-5 pen. 0-1 a.e.t. (0-1, 0-0)"
 */
export function parseScore(raw: string): Score | null {
  const s = raw.trim();
  const pair = (x: string) => x.split("-").map(Number) as [number, number];
  let m = s.match(/^(\d+)-(\d+) pen\.(?: (\d+-\d+) a\.e\.t\.)?(?: \((\d+-\d+)(?:, \d+-\d+)?\))?$/);
  if (m) {
    const ft = m[3] ?? m[4];
    const [hg, ag] = ft ? pair(ft) : [null, null];
    return { homeGoals: hg, awayGoals: ag, homePens: +m[1], awayPens: +m[2], extraTime: !!m[3] };
  }
  m = s.match(/^(\d+)-(\d+)( a\.e\.t\.)?(?: \(\d+-\d+(?:, \d+-\d+)?\))?$/);
  if (m) return { homeGoals: +m[1], awayGoals: +m[2], homePens: null, awayPens: null, extraTime: !!m[3] };
  return null;
}

interface DateRange {
  start: string; // yyyy-mm-dd
  end: string;
}

const iso = (y: number, m: number, d: number) =>
  `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

function parseRange(line: string): DateRange | null {
  // "# Date       Fri Jan/21 - Thu Dec/22 2005 (335d)"  |  "Fri Jul/26 2013 - Sun May/11 2014"
  const m = line.match(/(\w{3})\/(\d+)(?: (\d{4}))? - \w{3} (\w{3})\/(\d+) (\d{4})/);
  if (!m) return null;
  const endYear = +m[6];
  return { start: iso(m[3] ? +m[3] : endYear, MONTHS[m[1]], +m[2]), end: iso(endYear, MONTHS[m[4]], +m[5]) };
}

const dayNumber = (d: string) => Date.parse(`${d}T00:00:00Z`) / 86_400_000;

/**
 * Las fechas vienen sin año ("[Fri Jan/31]"). Se elige el año dentro del rango de la temporada;
 * si hay ambigüedad (temporadas de más de 12 meses, como la 2020 que terminó en febrero de 2021),
 * se elige el año más cercano a `reference`: la primera fecha de la jornada en curso (o de la anterior).
 * No se usa la fecha inmediatamente anterior porque los partidos reprogramados aparecen dentro de su
 * jornada original con fechas muy posteriores.
 */
export function inferDate(month: number, day: number, range: DateRange, reference: string | null): string {
  const y0 = Number(range.start.slice(0, 4));
  const y1 = Number(range.end.slice(0, 4));
  const candidates: string[] = [];
  for (let y = y0; y <= y1; y++) {
    const c = iso(y, month, day);
    if (c >= range.start && c <= range.end) candidates.push(c);
  }
  if (candidates.length === 0) return iso(month >= Number(range.start.slice(5, 7)) ? y0 : y1, month, day);
  if (candidates.length === 1 || !reference) return candidates[0];
  const ref = dayNumber(reference);
  return candidates.reduce((best, c) => (Math.abs(dayNumber(c) - ref) < Math.abs(dayNumber(best) - ref) ? c : best));
}

export function parseFootballTxt(text: string): ParsedFile {
  const warnings: string[] = [];
  const matches: ParsedMatch[] = [];
  let skipped = 0;
  let title = "";
  let range: DateRange | null = null;
  let stage: string | null = null;
  let round: string | null = null;
  let date: string | null = null;
  let roundAnchor: string | null = null; // primera fecha de la jornada en curso
  let lastAnchor: string | null = null; // primera fecha de la jornada anterior

  const lines = text.split(/\r?\n/);
  lines.forEach((rawLine, i) => {
    const lineNo = i + 1;
    const line = rawLine.replace(/\s+$/, "");
    if (!line.trim()) return;

    if (line.startsWith("= ")) {
      title = line.slice(2).trim();
      return;
    }
    if (line.startsWith("# Date")) {
      range = parseRange(line);
      return;
    }
    if (line.startsWith("#")) return;
    if (line.startsWith("== ")) {
      stage = line.slice(3).trim();
      round = null;
      lastAnchor = roundAnchor ?? lastAnchor;
      roundAnchor = null;
      return;
    }
    const dm = line.match(/^\[\w{3} (\w{3})\/(\d{1,2})(?: (\d{4}))?\]$/);
    if (dm) {
      const month = MONTHS[dm[1]];
      if (dm[3]) date = iso(+dm[3], month, +dm[2]);
      else if (range) date = inferDate(month, +dm[2], range, roundAnchor ?? lastAnchor);
      else warnings.push(`L${lineNo}: fecha sin rango de temporada`);
      roundAnchor ??= date;
      return;
    }
    if (!/^\s/.test(line)) {
      round = line.trim();
      lastAnchor = roundAnchor ?? lastAnchor;
      roundAnchor = null;
      return;
    }

    // Línea de partido: [hora]  local  marcador  visita  [anotación]   (separados por 2+ espacios)
    let body = line.trim();
    let note: string | null = null;
    const nm = body.match(/\s+\[(\w+)\]$/);
    if (nm) {
      note = nm[1].toLowerCase();
      body = body.slice(0, nm.index).trim();
    }
    const parts = body.split(/\s{2,}/);
    if (/^\d{1,2}\.\d{2}$/.test(parts[0])) parts.shift();
    if (parts.length !== 3 || !date) {
      warnings.push(`L${lineNo}: línea no reconocida: ${line.trim()}`);
      return;
    }
    const [home, scoreRaw, away] = parts;
    if (scoreRaw === "-" || (note && note !== "awarded")) {
      skipped++;
      return;
    }
    const score = parseScore(scoreRaw);
    if (!score) {
      warnings.push(`L${lineNo}: marcador no reconocido "${scoreRaw}" (${home} vs ${away})`);
      return;
    }
    matches.push({ date, stage, round, home, away, ...score, awarded: note === "awarded", line: lineNo });
  });

  return { title, matches, skipped, warnings };
}

const ROUND_ES: [RegExp, (m: RegExpMatchArray) => string][] = [
  [/^Matchday (\d+)$/i, (m) => `Fecha ${m[1]}`],
  [/^Round (\d+)$/i, (m) => `Ronda ${m[1]}`],
  [/^(\d+)\. Runde(.*)$/i, (m) => `Ronda ${m[1]}${m[2].replace(/Gruppe/i, "· Grupo")}`],
  [/^Round of 16$/i, () => "Octavos de final"],
  [/^Quarterfinals?$/i, () => "Cuartos de final"],
  [/^Semifinals?$/i, () => "Semifinal"],
  [/^Finals?$/i, () => "Final"],
  [/^(?:Group|Gruppe) (\w+)$/i, (m) => `Grupo ${m[1]}`],
  [/^Qualifikation$/i, () => "Clasificación"],
  [/^Preliminary round$/i, () => "Fase previa"],
  [/^Decider$/i, () => "Partido de desempate"],
  [/^Playoffs?$/i, () => "Liguilla"],
];

export function roundToSpanish(round: string | null): string | null {
  if (!round) return null;
  for (const [re, fn] of ROUND_ES) {
    const m = round.match(re);
    if (m) return fn(m);
  }
  return round;
}

const STAGE_ES: [RegExp, string][] = [
  [/Ap\. Playoff Libert\./i, "Liguilla Libertadores"],
  [/Copa Lib Playoffs|Playoffs Libertadores/i, "Liguilla Libertadores"],
  [/Copa Sud Playoffs/i, "Liguilla Sudamericana"],
  [/Torneo Transición/i, "Torneo de Transición"],
];

export function stageToSpanish(stage: string | null): string | null {
  if (!stage) return null;
  let out = stage;
  for (const [re, es] of STAGE_ES) out = out.replace(re, es);
  return out;
}

/**
 * Una final de título es la ronda "Final" o una fase llamada "... Final" (no semifinal / cuartos).
 * Las liguillas de clasificación a Libertadores / Sudamericana también tienen ronda "Final",
 * pero no definen un título, así que se excluyen.
 */
export function isFinalRound(stage: string | null, round: string | null): boolean {
  if (stage && /Libert|Lib Playoffs|Copa Sud/i.test(stage)) return false;
  const isFinal = (s: string | null) => !!s && /(^|\s)finals?$/i.test(s.trim()) && !/semi|quarter/i.test(s);
  return isFinal(round) || isFinal(stage);
}
