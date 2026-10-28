/**
 * Importación de asistencias desde comprobantes de compra de entradas (PuntoTicket u otra ticketera).
 *
 * PuntoTicket no ofrece API pública, pero cada compra genera un correo de confirmación con el nombre
 * del evento ("Universidad de Chile vs. Colo-Colo") y la fecha. El hincha pega ese correo (o sube el
 * .eml) y aquí se extraen equipos y fechas para proponerle los partidos de la base que coinciden.
 * El texto no se guarda: solo se usa para generar la propuesta.
 */
import type { Db } from "../db/client.ts";
import { slugify } from "../domain/normalize.ts";
import type { Match } from "../domain/types.ts";
import { listClubMatches } from "../repo/matches.ts";

export interface TeamNames {
  id: string;
  name: string;
  short?: string;
  aliases?: string[];
}

/** Apodos frecuentes en nombres de eventos y URLs de ticketeras. */
const TICKET_ALIASES: Record<string, string[]> = {
  "universidad-de-chile": ["UdeChile", "U de Chile", "La U"],
  "universidad-catolica": ["Católica", "UC", "Cruzados"],
  "santiago-wanderers": ["Wanderers"],
  "union-la-calera": ["La Calera"],
  "deportes-antofagasta": ["CD Antofagasta"],
};

// ----------------------------------------------------------------------------
// Texto del correo

function decodeQuotedPrintable(s: string): string {
  const joined = s.replace(/=\r?\n/g, "");
  const bytes: number[] = [];
  for (let i = 0; i < joined.length; i++) {
    const hex = joined.slice(i + 1, i + 3);
    if (joined[i] === "=" && /^[0-9A-Fa-f]{2}$/.test(hex)) {
      bytes.push(parseInt(hex, 16));
      i += 2;
    } else bytes.push(...Buffer.from(joined[i], "utf8"));
  }
  return Buffer.from(bytes).toString("utf8");
}

const ENTITIES: Record<string, string> = { nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', aacute: "á", eacute: "é", iacute: "í", oacute: "ó", uacute: "ú", ntilde: "ñ", Ntilde: "Ñ" };

function stripHtml(s: string): string {
  return s
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(#\d+|\w+);/g, (m, e: string) =>
      e.startsWith("#") ? String.fromCharCode(Number(e.slice(1))) : (ENTITIES[e] ?? m),
    );
}

/** Convierte un correo (texto pegado o .eml crudo, con quoted-printable o base64) en texto plano. */
export function emailToText(raw: string): string {
  let text = raw;
  // Partes base64 de un .eml: se decodifican y se agregan al texto.
  const base64Parts = [...raw.matchAll(/Content-Transfer-Encoding:\s*base64\s*\r?\n(?:[\w-]+:.*\r?\n)*\r?\n([A-Za-z0-9+/=\r\n]+)/gi)];
  for (const [, b64] of base64Parts) text += "\n" + Buffer.from(b64.replace(/\s+/g, ""), "base64").toString("utf8");
  if (/quoted-printable/i.test(raw) || /=[0-9A-F]{2}/.test(raw)) text = decodeQuotedPrintable(text);
  return stripHtml(text).replace(/[ \t]+/g, " ");
}

// ----------------------------------------------------------------------------
// Fechas

export interface FoundDate {
  year: number | null;
  month: number;
  day: number;
}

const MONTH_PATTERNS = [
  "ene(?:ro)?",
  "feb(?:rero)?",
  "mar(?:zo)?",
  "abr(?:il)?",
  "may(?:o)?",
  "jun(?:io)?",
  "jul(?:io)?",
  "ago(?:sto)?",
  "sep(?:t(?:iembre)?)?|set(?:iembre)?",
  "oct(?:ubre)?",
  "nov(?:iembre)?",
  "dic(?:iembre)?",
];

export function findDates(text: string): FoundDate[] {
  const t = text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const out: FoundDate[] = [];
  const push = (year: number | null, month: number, day: number) => {
    if (month < 1 || month > 12 || day < 1 || day > 31) return;
    if (year !== null && year < 100) year += 2000;
    if (!out.some((d) => d.year === year && d.month === month && d.day === day)) out.push({ year, month, day });
  };
  for (const m of t.matchAll(/\b(\d{4})-(\d{2})-(\d{2})\b/g)) push(+m[1], +m[2], +m[3]);
  for (const m of t.matchAll(/\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{4}|\d{2})\b/g)) push(+m[3], +m[2], +m[1]);
  // "10 de agosto de 2024", "10 ago 2024", "sáb 10 ago.", "10-ago-24" (correos, capturas de "Mis compras", PDF).
  MONTH_PATTERNS.forEach((pattern, i) => {
    const re = new RegExp(`\\b(\\d{1,2})(?:\\s+de)?[\\s./-]+(?:${pattern})\\.?(?![a-z])(?:,?[\\s./-]*(?:de(?:l)?\\s+)?(\\d{4}|\\d{2}(?![\\d:])))?`, "g");
    for (const m of t.matchAll(re)) push(m[2] ? +m[2] : null, i + 1, +m[1]);
  });
  return out;
}

// ----------------------------------------------------------------------------
// Equipos

/** Índice de nombres de equipo para buscar menciones dentro de un texto libre. */
export class TeamMentionIndex {
  private readonly entries: { slug: string; id: string }[] = [];

  constructor(teams: TeamNames[]) {
    for (const t of teams) {
      const names = [t.name, t.short, ...(t.aliases ?? []), ...(TICKET_ALIASES[t.id] ?? [])];
      for (const n of names) if (n) this.entries.push({ slug: slugify(n), id: t.id });
    }
    // Primero los nombres más largos: "universidad-de-chile" antes que "chile".
    this.entries.sort((a, b) => b.slug.length - a.slug.length);
  }

  find(text: string): string[] {
    let haystack = `-${slugify(text)}-`;
    const found: string[] = [];
    for (const { slug, id } of this.entries) {
      const needle = `-${slug}-`;
      if (!haystack.includes(needle)) continue;
      if (!found.includes(id)) found.push(id);
      // Se "consume" la mención para que un alias corto no vuelva a coincidir dentro de uno largo.
      haystack = haystack.split(needle).join("-#-");
    }
    return found;
  }
}

// ----------------------------------------------------------------------------
// Propuesta de partidos

export interface TicketCandidate {
  match: Match;
  reason: string;
}

const pad = (n: number) => String(n).padStart(2, "0");
const dayDiff = (a: string, b: string) => Math.abs(Date.parse(a) - Date.parse(b)) / 86_400_000;

export interface TicketAnalysis {
  candidates: TicketCandidate[];
  /** Fechas del comprobante sin partido del club en la base (p. ej. temporadas aún no cargadas). */
  unmatchedDates: string[];
}

/**
 * Busca, entre los partidos del club del hincha, los que coinciden con las fechas y rivales del comprobante.
 * Tolera ±1 día (eventos que terminan pasada la medianoche o fechas de compra vs. de partido).
 */
export async function analyzeTicket(db: Db, clubId: string, text: string, index: TeamMentionIndex): Promise<TicketAnalysis> {
  const plain = emailToText(text);
  const dates = findDates(plain);
  const rivals = index.find(plain).filter((id) => id !== clubId);
  if (!dates.length) return { candidates: [], unmatchedDates: [] };

  const clubMatches = await listClubMatches(db, clubId);
  const candidates = new Map<string, TicketCandidate>();
  const unmatchedDates: string[] = [];
  for (const d of dates) {
    const when = d.year !== null ? `${pad(d.day)}/${pad(d.month)}/${d.year}` : `${pad(d.day)}/${pad(d.month)}`;
    let found = false;
    for (const m of clubMatches) {
      const rival = m.homeTeamId === clubId ? m.awayTeamId : m.homeTeamId;
      const rivalOk = rivals.length === 0 || rivals.includes(rival);
      const dateOk =
        d.year !== null
          ? dayDiff(m.date, `${d.year}-${pad(d.month)}-${pad(d.day)}`) <= 1
          : rivals.length > 0 && m.date.slice(5) === `${pad(d.month)}-${pad(d.day)}`;
      if (!dateOk || !rivalOk) continue;
      found = true;
      if (!candidates.has(m.id)) {
        candidates.set(m.id, { match: m, reason: rivals.length ? `fecha ${when} y rival mencionado` : `fecha ${when}` });
      }
    }
    if (!found && d.year !== null) unmatchedDates.push(when);
  }
  return {
    candidates: [...candidates.values()].sort((a, b) => b.match.date.localeCompare(a.match.date)),
    unmatchedDates,
  };
}

export async function findTicketMatches(
  db: Db,
  clubId: string,
  text: string,
  index: TeamMentionIndex,
): Promise<TicketCandidate[]> {
  return (await analyzeTicket(db, clubId, text, index)).candidates;
}
