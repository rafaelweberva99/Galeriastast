/**
 * Importación de una planilla (Excel copiado y pegado, CSV o TSV) con los partidos a los que fue el hincha.
 * Cada fila se reconoce, en este orden, por:
 *   1. el código del partido (p. ej. 2024-08-10_universidad-de-chile_colo-colo);
 *   2. una fecha completa (± 1 día) y, si aparece, el rival;
 *   3. el año, el rival y el resultado (p. ej. "2017 · UCH 2-1 Palestino").
 * Las filas que no calzan con un solo partido se devuelven con el motivo, para que el hincha las revise.
 */
import type { Db } from "../db/client.ts";
import type { Match } from "../domain/types.ts";
import { listClubMatches } from "../repo/matches.ts";
import { findDates, TeamMentionIndex, type TeamNames } from "./tickets.ts";

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
};

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
  // Rivales extranjeros por su nombre corto ("Racing", "Vasco da Gama"), solo si ese prefijo no es ambiguo.
  const catalog = new Set(teams.map((t) => t.id));
  const prefixes = new Map<string, Set<string>>();
  for (const t of known.values()) {
    if (catalog.has(t.id)) continue;
    const words = t.name.replace(/\s*\([A-Z]{3}\)$/, "").split(/\s+/);
    for (let n = 1; n < words.length; n++) {
      const prefix = words.slice(0, n).join(" ");
      if (prefix.length >= 5) prefixes.set(prefix, (prefixes.get(prefix) ?? new Set()).add(t.id));
    }
  }
  const shortNames = new Map<string, string[]>();
  for (const [prefix, ids] of prefixes) if (ids.size === 1) shortNames.set([...ids][0], [...(shortNames.get([...ids][0]) ?? []), prefix]);
  const index = new TeamMentionIndex(
    [...known.values()].map((t) => ({
      ...t,
      aliases: [...(t.aliases ?? []), ...(SHEET_ALIASES[t.id] ?? []), ...(shortNames.get(t.id) ?? [])],
    })),
  );
  // Primera celda que menciona a un equipo: sirve para saber quién era local.
  const firstCell = (cells: string[], pred: (ids: string[]) => boolean) => cells.findIndex((c) => pred(index.find(c)));

  const rows = splitSheet(text).slice(0, MAX_ROWS);
  const out: SheetRow[] = [];
  rows.forEach((cells, i) => {
    const rowText = cells.join(" ").trim();
    const row: SheetRow = { line: i + 1, text: cells.filter(Boolean).join(" · ") };
    // Encabezados y filas sin datos de partido.
    const idCell = cells.find((c) => MATCH_ID.test(c));
    const dates = findDates(rowText).filter((d) => d.year !== null);
    const year = rowText.match(YEAR)?.[1];
    if (!idCell && !dates.length && !year) {
      if (i > 0) out.push({ ...row, problem: "no tiene fecha ni año" });
      return;
    }
    const rivals = index.find(rowText).filter((id) => id !== clubId);

    if (idCell) {
      const m = byId.get(idCell);
      out.push(m ? { ...row, match: m, reason: "código del partido" } : { ...row, problem: "ese código no es un partido de tu club" });
      return;
    }

    let candidates: Match[];
    let reason: string;
    if (dates.length) {
      const wanted = dates.map((d) => `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`);
      candidates = clubMatches.filter((m) => wanted.some((w) => Math.abs(Date.parse(m.date) - Date.parse(w)) <= 86_400_000));
      if (rivals.length) candidates = candidates.filter((m) => rivals.includes(m.homeTeamId === clubId ? m.awayTeamId : m.homeTeamId));
      reason = rivals.length ? "fecha y rival" : "fecha";
    } else {
      if (!rivals.length) {
        out.push({ ...row, problem: "no reconocimos al rival" });
        return;
      }
      candidates = clubMatches.filter(
        (m) => m.date.startsWith(year!) && rivals.includes(m.homeTeamId === clubId ? m.awayTeamId : m.homeTeamId),
      );
      reason = "año y rival";
      // Localía: si el club aparece antes que el rival en la fila, era local.
      const clubAt = firstCell(cells, (ids) => ids.includes(clubId));
      const rivalAt = firstCell(cells, (ids) => ids.some((id) => rivals.includes(id)));
      const sameYearAndRival = candidates;
      const clubHome = clubAt >= 0 && rivalAt >= 0 && clubAt !== rivalAt ? clubAt < rivalAt : null;
      if (clubHome !== null) {
        const sided = candidates.filter((m) => (m.homeTeamId === clubId) === clubHome);
        if (sided.length) {
          candidates = sided;
          reason = clubHome ? "año, rival y localía" : "año, rival y visita";
        }
      }
      const score = rowText.replace(YEAR, " ").match(SCORE);
      if (score) {
        const [a, b] = [Number(score[1]), Number(score[2])];
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
          out.push({ ...row, options, problem: options.length ? "el resultado no calza con la localía" : "no encontramos ese partido de tu club en la base" });
          return;
        }
        candidates = either;
      }
    }

    if (candidates.length === 1) out.push({ ...row, match: candidates[0], reason });
    else if (candidates.length > 1) out.push({ ...row, options: candidates, problem: `calza con ${candidates.length} partidos` });
    else out.push({ ...row, problem: "no encontramos ese partido de tu club en la base" });
  });
  return out;
}
