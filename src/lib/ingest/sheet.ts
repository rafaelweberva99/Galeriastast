/**
 * Importación de una planilla (Excel copiado y pegado, CSV o TSV) con los partidos a los que fue el hincha.
 * Cada fila se reconoce, en este orden, por:
 *   1. el código del partido (p. ej. 2024-08-10_universidad-de-chile_colo-colo);
 *   2. una fecha completa (± 1 día) y, si aparece, el rival;
 *   3. el año, el rival y el resultado (p. ej. "2017 · UCH 2-1 Palestino").
 * Si la planilla trae título, tablas de resumen al costado o columnas extra, se usa solo la tabla de partidos
 * (la que parte con un encabezado como AÑO · LOCAL · RESULTADO · RIVAL · CAMPEONATO).
 * La columna de campeonato ayuda a elegir (Liga, Copa Chile, Libertadores…), y si el año no calza se
 * sugiere el partido contra ese rival en un año vecino.
 * Las filas que no calzan con un solo partido se devuelven con el motivo, para que el hincha las revise.
 */
import type { Db } from "../db/client.ts";
import type { Match } from "../domain/types.ts";
import { listClubMatches } from "../repo/matches.ts";
import { slugify } from "../domain/normalize.ts";
import { competitionHint, findDates, TeamMentionIndex, type TeamNames } from "./tickets.ts";

/** Abreviaturas habituales en planillas personales. */
const SHEET_ALIASES: Record<string, string[]> = {
  "colo-colo": ["CC", "Colo Colo", "Cacique", "Albos"],
  "universidad-de-chile": ["UCH", "U de Chile", "La U", "Azules"],
  "universidad-catolica": ["UC", "Católica", "Cruzados"],
  "santiago-wanderers": ["SW", "Wanderers"],
  "union-espanola": ["UE", "Unión Española", "Hispanos"],
  "union-la-calera": ["Calera", "La Calera"],
  "deportes-iquique": ["Iquique"],
  "deportes-temuco": ["Temuco"],
  "deportes-antofagasta": ["Antofagasta"],
  "deportes-limache": ["Limache"],
  "coquimbo-unido": ["Coquimbo"],
  "copiapo": ["Copiapó"],
  "ohiggins": ["O'Higgins", "OHiggins"],
  "audax-italiano": ["Audax"],
  "universidad-de-concepcion": ["UdeC", "U de Conce"],
  "deportes-concepcion": ["Conce"],
  "santiago-morning": ["Morning"],
  // Rivales extranjeros con nombres de uso común distintos al de la base.
  "america-mg-bra": ["América Mineiro"],
  "atletico-mg-bra": ["Atlético Mineiro"],
  "flamengo-rj-bra": ["Flamengo"],
  "corinthians-sp-bra": ["Corinthians"],
  "fbc-melgar-per": ["Melgar"],
};

/** Distancia de edición (Levenshtein) para tolerar errores de tipeo en los nombres. */
function editDistance(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 2) return 99;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
}

const MATCH_ID = /^\d{4}-\d{2}-\d{2}_[a-z0-9-]+_[a-z0-9-]+$/;
const SCORE = /(\d{1,2})\s*-+\s*(\d{1,2})(?!\d)/;
const YEAR = /\b(19[5-9]\d|20\d{2})\b/;
const MAX_ROWS = 2000;

export interface SheetRow {
  line: number;
  text: string;
  /** Partido reconocido sin ambigüedad. */
  match?: Match;
  reason?: string;
  /** Partidos posibles cuando la fila calza con más de uno. */
  options?: Match[];
  problem?: string;
}

/** Separa la planilla en filas y celdas (tabulador, punto y coma o coma; respeta comillas). */
export function splitSheet(text: string): string[][] {
  const lines = text.replace(/\r\n?/g, "\n").split("\n").filter((l) => l.trim());
  const sample = lines.slice(0, 20).join("\n");
  const delimiter = sample.includes("\t") ? "\t" : (sample.match(/;/g)?.length ?? 0) > (sample.match(/,/g)?.length ?? 0) ? ";" : ",";
  return lines.map((line) => {
    const cells: string[] = [];
    let cell = "";
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (quoted && line[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = !quoted;
      } else if (ch === delimiter && !quoted) {
        cells.push(cell.trim());
        cell = "";
      } else cell += ch;
    }
    cells.push(cell.trim());
    return cells;
  });
}

const sameScore = (m: Match, a: number, b: number) =>
  (m.homeGoals === a && m.awayGoals === b) || (m.homeGoals === b && m.awayGoals === a);

/** Palabras de encabezado de una tabla de partidos. */
const HEADER_WORDS = new Set([
  "ano", "anio", "temporada", "fecha", "dia", "local", "visita", "visitante", "rival", "resultado", "marcador",
  "campeonato", "competicion", "torneo", "copa", "goles", "estadio", "partido", "jornada", "condicion", "equipo",
]);
const isHeaderCell = (c: string) => {
  const words = slugify(c).split("-").filter(Boolean);
  return words.length > 0 && words.length <= 3 && HEADER_WORDS.has(words[0]);
};

/** Tabla de partidos dentro de la hoja: fila del encabezado y columnas contiguas que lo forman. */
function mainTable(rows: string[][]): { start: number; from: number; to: number } | null {
  for (let r = 0; r < Math.min(rows.length, 20); r++) {
    const flags = rows[r].map(isHeaderCell);
    if (flags.filter(Boolean).length < 3) continue;
    const first = flags.indexOf(true);
    let to = first;
    while (to + 1 < rows[r].length && rows[r][to + 1].trim() !== "") to++;
    return { start: r + 1, from: first, to };
  }
  return null;
}

/** Palabras genéricas que no sirven para reconocer a un club por sí solas. */
const GENERIC = new Set([
  "club", "deportes", "deportivo", "universidad", "union", "atletico", "sport", "sporting", "santiago", "real", "city",
  "united", "futbol", "clube", "esporte", "regatas", "sociedad", "asociacion", "nacional",
]);

export async function analyzeSheet(db: Db, clubId: string, text: string, teams: TeamNames[]): Promise<SheetRow[]> {
  const clubMatches = await listClubMatches(db, clubId);
  const byId = new Map(clubMatches.map((m) => [m.id, m]));
  // Rivales posibles: los clubes del catálogo y todos los que alguna vez enfrentaron al club del hincha.
  const known = new Map(teams.map((t) => [t.id, t]));
  for (const m of clubMatches) {
    for (const [id, name] of [
      [m.homeTeamId, m.homeTeamName],
      [m.awayTeamId, m.awayTeamName],
    ]) {
      if (!known.has(id)) known.set(id, { id, name });
    }
  }
  // Rivales extranjeros por su nombre corto: prefijos ("Racing", "Vasco da Gama") y palabras propias
  // ("Melgar" en "FBC Melgar", "Pereira"), solo si no son ambiguos.
  const catalog = new Set(teams.map((t) => t.id));
  const shortCandidates = new Map<string, Set<string>>();
  const addShort = (label: string, id: string) => shortCandidates.set(label, (shortCandidates.get(label) ?? new Set()).add(id));
  for (const t of known.values()) {
    if (catalog.has(t.id)) continue;
    const words = t.name.replace(/\s*\([A-Z]{3}\)$/, "").split(/\s+/);
    for (let n = 1; n < words.length; n++) {
      const prefix = words.slice(0, n).join(" ");
      if (prefix.length >= 5) addShort(prefix, t.id);
    }
    for (const w of words) if (w.length >= 5 && !GENERIC.has(slugify(w))) addShort(w, t.id);
  }
  const shortNames = new Map<string, string[]>();
  for (const [label, ids] of shortCandidates) {
    if (ids.size !== 1) continue;
    const id = [...ids][0];
    shortNames.set(id, [...(shortNames.get(id) ?? []), label]);
  }
  const index = new TeamMentionIndex(
    [...known.values()].map((t) => ({
      ...t,
      aliases: [...(t.aliases ?? []), ...(SHEET_ALIASES[t.id] ?? []), ...(shortNames.get(t.id) ?? [])],
    })),
  );
  const rivalOf = (m: Match) => (m.homeTeamId === clubId ? m.awayTeamId : m.homeTeamId);
  // Nombres conocidos para la búsqueda tolerante a errores ("Ohigigins", "Univeridad de Concepcion").
  const fuzzyNames: { slug: string; id: string }[] = [];
  for (const t of known.values()) {
    for (const n of [t.name, t.short, ...(t.aliases ?? []), ...(SHEET_ALIASES[t.id] ?? []), ...(shortNames.get(t.id) ?? [])]) {
      if (n && n.length >= 6) fuzzyNames.push({ slug: slugify(n.replace(/\s*\([A-Z]{3}\)$/, "")), id: t.id });
    }
  }
  const fuzzyRivals = (cells: string[]): string[] => {
    for (const cell of cells) {
      const slug = slugify(cell);
      if (slug.length < 6 || /^\d/.test(slug)) continue;
      let best: { d: number; ids: Set<string> } = { d: 99, ids: new Set() };
      for (const n of fuzzyNames) {
        const d = editDistance(slug, n.slug);
        if (d < best.d) best = { d, ids: new Set([n.id]) };
        else if (d === best.d) best.ids.add(n.id);
      }
      const limit = slug.length >= 10 ? 2 : 1;
      if (best.d <= limit && best.ids.size === 1 && ![...best.ids].includes(clubId)) return [...best.ids];
    }
    return [];
  };
  // Primera celda que menciona a un equipo: sirve para saber quién era local.
  const firstCell = (cells: string[], pred: (ids: string[]) => boolean) => cells.findIndex((c) => pred(index.find(c)));

  const all = splitSheet(text).slice(0, MAX_ROWS);
  const table = mainTable(all);
  const out: SheetRow[] = [];
  all.forEach((rawCells, i) => {
    if (table && i < table.start) return; // título y encabezado
    const cells = table ? rawCells.slice(table.from, table.to + 1) : rawCells;
    const rowText = cells.join(" ").trim();
    if (!rowText) return; // fila vacía o solo con tablas de resumen al costado
    const row: SheetRow = { line: i + 1, text: cells.filter(Boolean).join(" · ") };
    const idCell = cells.find((c) => MATCH_ID.test(c));
    const dates = findDates(rowText).filter((d) => d.year !== null);
    const year = rowText.match(YEAR)?.[1];
    if (!idCell && !dates.length && !year) {
      if (table || i > 0) out.push({ ...row, problem: "no tiene fecha ni año" });
      return;
    }

    if (idCell) {
      const m = byId.get(idCell);
      out.push(m ? { ...row, match: m, reason: "código del partido" } : { ...row, problem: "ese código no es un partido de tu club" });
      return;
    }

    const hint = competitionHint(rowText);
    if (hint === "amistoso") {
      out.push({ ...row, problem: "los amistosos no se cuentan (no están en la base)" });
      return;
    }
    let rivals = index.find(rowText).filter((id) => id !== clubId);
    if (!rivals.length) rivals = fuzzyRivals(cells);
    const byHint = (pool: Match[]) => (hint && pool.some((m) => m.competitionId === hint) ? pool.filter((m) => m.competitionId === hint) : pool);
    const score = rowText.replace(YEAR, " ").replace(/\b\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}\b/g, " ").match(SCORE);
    const [a, b] = score ? [Number(score[1]), Number(score[2])] : [NaN, NaN];

    let candidates: Match[];
    let reason: string;
    if (dates.length) {
      const wanted = dates.map((d) => `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`);
      const near = (days: number) =>
        clubMatches.filter(
          (m) =>
            wanted.some((w) => Math.abs(Date.parse(m.date) - Date.parse(w)) <= days * 86_400_000) &&
            (!rivals.length || rivals.includes(rivalOf(m))),
        );
      candidates = near(1);
      reason = rivals.length ? "fecha y rival" : "fecha";
      if (!candidates.length && rivals.length) {
        // La fecha no calza: ¿el mismo rival unos días antes o después?
        const close = byHint(near(10));
        out.push({
          ...row,
          options: close,
          problem: close.length ? "la fecha no calza; ¿quizás fue este?" : "no encontramos ese partido de tu club en la base",
        });
        return;
      }
    } else {
      if (!rivals.length) {
        out.push({ ...row, problem: "no reconocimos al rival" });
        return;
      }
      const vsRival = clubMatches.filter((m) => rivals.includes(rivalOf(m)));
      candidates = byHint(vsRival.filter((m) => m.date.startsWith(year!)));
      reason = hint && candidates.some((m) => m.competitionId === hint) ? "año, rival y campeonato" : "año y rival";
      if (!candidates.length) {
        // El año no calza: se sugieren los partidos contra ese rival en los años vecinos (mejor si calza el resultado).
        const y = Number(year);
        const nearby = byHint(vsRival.filter((m) => Math.abs(Number(m.date.slice(0, 4)) - y) <= 1));
        const withScore = score ? nearby.filter((m) => sameScore(m, a, b)) : [];
        const options = (withScore.length ? withScore : nearby).slice(0, 4);
        const years = [...new Set(options.map((m) => m.date.slice(0, 4)))].join(" o ");
        out.push({
          ...row,
          options,
          problem: options.length
            ? `no hay partido contra ese rival en ${year}; ¿quizás fue en ${years}?`
            : `no encontramos partidos contra ese rival en ${year} en la base`,
        });
        return;
      }
      // Localía: si el club aparece antes que el rival en la fila, era local.
      const clubAt = firstCell(cells, (ids) => ids.includes(clubId));
      const rivalAt = firstCell(cells, (ids) => ids.some((id) => rivals.includes(id)));
      const sameYearAndRival = candidates;
      const clubHome = clubAt >= 0 && rivalAt >= 0 && clubAt !== rivalAt ? clubAt < rivalAt : null;
      if (clubHome !== null) {
        const sided = candidates.filter((m) => (m.homeTeamId === clubId) === clubHome);
        if (sided.length) {
          candidates = sided;
          reason += clubHome ? " (local)" : " (visita)";
        }
      }
      if (score) {
        const exact = candidates.filter((m) => m.homeGoals === a && m.awayGoals === b);
        const either = candidates.filter((m) => sameScore(m, a, b));
        const hit = exact.length === 1 ? exact : either.length === 1 ? either : null;
        if (hit) {
          out.push({ ...row, match: hit[0], reason: reason.replace("año, rival", "año, rival, resultado") });
          return;
        }
        if (!either.length) {
          // Se sugieren el partido con la localía escrita y el que tiene ese resultado con la localía invertida.
          const flipped = sameYearAndRival.filter((m) => sameScore(m, a, b));
          const options = [...new Map([...candidates, ...flipped].map((m) => [m.id, m])).values()];
          out.push({ ...row, options, problem: "el resultado no calza; ¿quizás fue este?" });
          return;
        }
        candidates = either;
      }
    }

    if (candidates.length === 1) out.push({ ...row, match: candidates[0], reason });
    else if (candidates.length > 1) out.push({ ...row, options: candidates, problem: `calza con ${candidates.length} partidos; elige el tuyo` });
    else out.push({ ...row, problem: "no encontramos ese partido de tu club en la base" });
  });
  return out;
}
