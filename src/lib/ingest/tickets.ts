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

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

export function findDates(text: string): FoundDate[] {
  const t = text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/setiembre/g, "septiembre");
  const out: FoundDate[] = [];
  const push = (year: number | null, month: number, day: number) => {
    if (month < 1 || month > 12 || day < 1 || day > 31) return;
    if (year !== null && year < 100) year += 2000;
    if (!out.some((d) => d.year === year && d.month === month && d.day === day)) out.push({ year, month, day });
  };
  for (const m of t.matchAll(/\b(\d{4})-(\d{2})-(\d{2})\b/g)) push(+m[1], +m[2], +m[3]);
  for (const m of t.matchAll(/\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{4}|\d{2})\b/g)) push(+m[3], +m[2], +m[1]);
  const monthRe = MONTHS.join("|");
  for (const m of t.matchAll(new RegExp(`\\b(\\d{1,2}) de (${monthRe})(?:,? (?:de(?:l)? )?(\\d{4}))?`, "g"))) {
    push(m[3] ? +m[3] : null, MONTHS.indexOf(m[2]) + 1, +m[1]);
  }
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

/**
 * Busca, entre los partidos del club del hincha, los que coinciden con las fechas y rivales del comprobante.
 * Tolera ±1 día (eventos que terminan pasada la medianoche o fechas de compra vs. de partido).
 */
export function findTicketMatches(db: Db, clubId: string, text: string, index: TeamMentionIndex): TicketCandidate[] {
  const plain = emailToText(text);
  const dates = findDates(plain);
  const rivals = index.find(plain).filter((id) => id !== clubId);
  if (!dates.length) return [];

  const clubMatches = listClubMatches(db, clubId);
  const candidates = new Map<string, TicketCandidate>();
  for (const d of dates) {
    for (const m of clubMatches) {
      const rival = m.homeTeamId === clubId ? m.awayTeamId : m.homeTeamId;
      const rivalOk = rivals.length === 0 || rivals.includes(rival);
      let dateOk: boolean;
      if (d.year !== null) dateOk = dayDiff(m.date, `${d.year}-${pad(d.month)}-${pad(d.day)}`) <= 1;
      else dateOk = rivals.length > 0 && m.date.slice(5) === `${pad(d.month)}-${pad(d.day)}`;
      if (!dateOk || !rivalOk || candidates.has(m.id)) continue;
      const when = d.year !== null ? `${pad(d.day)}/${pad(d.month)}/${d.year}` : `${pad(d.day)}/${pad(d.month)}`;
      const reason = rivals.length ? `fecha ${when} y rival mencionado` : `fecha ${when}`;
      candidates.set(m.id, { match: m, reason });
    }
  }
  return [...candidates.values()].sort((a, b) => b.match.date.localeCompare(a.match.date));
}
