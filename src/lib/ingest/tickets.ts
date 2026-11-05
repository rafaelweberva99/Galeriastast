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
import { CAPTURE_BREAK_RE } from "../ticketText.ts";

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

  /** Nombres (slugs) con que se conoce a un club en este índice. */
  slugsOf(id: string): string[] {
    return this.entries.filter((e) => e.id === id).map((e) => e.slug);
  }

  /** El texto (como slug) sin las menciones de un club: así "Universidad de" de "Universidad de Chile" no pasa por otro club. */
  mask(text: string, id: string): string {
    let haystack = `-${slugify(text)}-`;
    for (const { slug, id: eid } of this.entries) if (eid === id) haystack = haystack.split(`-${slug}-`).join("-");
    return haystack;
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
  providers: string[];
  /** Fechas del comprobante sin partido del club en la base (p. ej. temporadas aún no cargadas). */
  unmatchedDates: string[];
}

/** Índice con los rivales que enfrentó el club, por nombre y por prefijos no ambiguos ("River Plate", "Alianza"). */
function opponentIndex(clubMatches: Match[], clubId: string): TeamMentionIndex {
  const names = new Map<string, string>();
  for (const m of clubMatches) {
    if (m.homeTeamId !== clubId) names.set(m.homeTeamId, m.homeTeamName);
    if (m.awayTeamId !== clubId) names.set(m.awayTeamId, m.awayTeamName);
  }
  const prefixes = new Map<string, Set<string>>();
  for (const [id, name] of names) {
    const words = name.split(/\s+/);
    for (let n = 1; n < words.length; n++) {
      const prefix = words.slice(0, n).join(" ");
      if (prefix.length >= 5) prefixes.set(prefix, (prefixes.get(prefix) ?? new Set()).add(id));
    }
  }
  return new TeamMentionIndex(
    [...names].map(([id, name]) => ({
      id,
      name,
      aliases: [...prefixes].filter(([, ids]) => ids.size === 1 && ids.has(id)).map(([prefix]) => prefix),
    })),
  );
}

/** Competición sugerida por el texto de una compra o una fila ("Copa Libertadores", "Campeonato PlanVital - Fecha 17"…). */
export function competitionHint(text: string): string | null {
  const t = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (/amistos/.test(t)) return "amistoso";
  if (/libertadores/.test(t)) return "copa-libertadores";
  if (/sudamericana/.test(t)) return "copa-sudamericana";
  if (/recopa/.test(t)) return "recopa-sudamericana";
  if (/supercopa/.test(t)) return "supercopa";
  if (/copa (de la )?liga/.test(t)) return "copa-de-la-liga";
  if (/copa chile/.test(t)) return "copa-chile";
  if (/campeonato|primera division|fecha \d+|torneo|apertura|clausura/.test(t)) return "primera-division";
  return null;
}

const WEEKDAYS: Record<string, number> = { dom: 0, lun: 1, mar: 2, mie: 3, jue: 4, vie: 5, sab: 6 };

/** Día de la semana escrito junto a la fecha ("lun. 24 feb.", "Sábado 3 de mayo"), o null. */
function weekdayOf(line: string): number | null {
  const t = line.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const m = t.match(/\b(dom|lun|mar|mie|jue|vie|sab)[a-z]*\.?,?\s+\d{1,2}\b/);
  return m ? WEEKDAYS[m[1]] : null;
}

/** Ventana para la fecha de compra: se compra antes del partido (a veces semanas antes). */
const PURCHASE_WINDOW_DAYS = 45;

/**
 * Busca, entre los partidos del club del hincha, los que coinciden con las fechas y rivales del comprobante.
 * Se lee por compra: cada fecha va con el texto que la sigue (la misma fila del historial o del correo).
 * - Si en esa compra aparece el rival, se busca el partido contra ese rival desde un día antes de la fecha
 *   hasta {@link PURCHASE_WINDOW_DAYS} días después (en "Mis compras" la fecha es la de compra), el más cercano,
 *   y la competición mencionada ayuda a elegir.
 * - Si no aparece el rival, se acepta solo el partido de esa fecha (± 1 día).
 */
export async function analyzeTicket(db: Db, clubId: string, text: string, index: TeamMentionIndex): Promise<TicketAnalysis> {
  const plain = emailToText(text);
  const providers = detectProviders(plain).map((p) => p.name);
  // Cada captura se analiza por separado: lo que queda cortado al borde de una no se mezcla con la siguiente.
  const chunks = plain.split(CAPTURE_BREAK_RE).map((c) => c.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)).filter((l) => l.length);
  if (!chunks.some((lines) => isPortalLayout(lines) || findDates(lines.join("\n")).length))
    return { candidates: [], unmatchedDates: [], providers };

  const clubMatches = await listClubMatches(db, clubId);
  // Además de los clubes del catálogo, todos los rivales que alguna vez enfrentó el club (extranjeros incluidos).
  const opponents = opponentIndex(clubMatches, clubId);
  // Se quita primero el propio club del texto: "Universidad de" (de "Universidad de Chile") no es otro rival.
  const findRivals = (t: string) => {
    const masked = index.mask(t, clubId);
    return [...new Set([...index.find(masked), ...opponents.find(masked)])].filter((id) => id !== clubId);
  };
  const rivalOf = (m: Match) => (m.homeTeamId === clubId ? m.awayTeamId : m.homeTeamId);
  const today = new Date().toISOString().slice(0, 10);
  const candidates = new Map<string, TicketCandidate>();
  const unmatchedDates: string[] = [];

  /** Captura de "Mis compras" en formato de fichas (N° de Orden / Fecha Compra / Evento…), una por compra. */
  const analyzePortal = (lines: string[]) => {
    const records: { purchase: string | null; event: string[] }[] = [];
    let cur: { purchase: string | null; event: string[] } = { purchase: null, event: [] };
    // Antes de la primera etiqueta puede venir el final de un evento cortado por el borde de la pantalla.
    let inEvent = true;
    for (const line of lines) {
      if (/^N\W{0,2}\s*de\s*Orden/i.test(line)) {
        records.push(cur);
        cur = { purchase: null, event: [] };
        inEvent = false;
      } else if (/^Fecha\s+Compra/i.test(line)) {
        const d = findDates(line).find((x) => x.year !== null);
        cur.purchase = d ? `${d.year}-${pad(d.month)}-${pad(d.day)}` : null;
        inEvent = false;
      } else if (/^Evento\b/i.test(line)) {
        inEvent = true;
        cur.event.push(line.replace(/^Evento\b[:\s]*/i, ""));
      } else if (PORTAL_LABEL.test(line)) inEvent = false;
      else if (inEvent) cur.event.push(line);
    }
    records.push(cur);

    for (const rec of records) {
      const title = rec.event.join(" ").trim();
      if (!title) continue;
      const when = rec.purchase ? `${rec.purchase.slice(8)}/${rec.purchase.slice(5, 7)}/${rec.purchase.slice(0, 4)}` : null;
      const rivals = findRivals(title);
      // Un evento sin rival conocido (un homenaje, un concierto) no se adivina por la fecha de compra.
      if (!rivals.length) {
        if (when && /\bvs\.?\s/i.test(title)) unmatchedDates.push(when);
        continue;
      }
      const hint = competitionHint(title);
      const season = title.match(/\b(20\d{2})\b/)?.[1];
      const round = title.match(/\bfecha\s*(\d{1,2})\b/i)?.[1];
      const bought = rec.purchase ? Date.parse(rec.purchase) : null;
      const inWindow = (m: Match) =>
        bought !== null && Date.parse(m.date) >= bought - 86_400_000 && Date.parse(m.date) <= bought + PURCHASE_WINDOW_DAYS * 86_400_000;
      const inSeason = (m: Match) => season !== undefined && m.season === Number(season);
      const roundOk = (m: Match) => round !== undefined && m.stage === `Fecha ${Number(round)}`;
      // "Universidad de Chile vs. X": el hincha compró para el partido en que su club es el local.
      const clubFirst = index.slugsOf(clubId).some((slug) => `-${slugify(title)}`.includes(`-${slug}-vs-`));
      let found = false;
      for (const rival of rivals) {
        let pool = clubMatches.filter((m) => rivalOf(m) === rival);
        if (hint && pool.some((m) => m.competitionId === hint)) pool = pool.filter((m) => m.competitionId === hint);
        // Con "Temporada + Fecha N" el partido se identifica aunque la compra no se vea o sea de mucho antes.
        let sel = round ? pool.filter((m) => roundOk(m) && (inSeason(m) || inWindow(m))) : pool.filter(inWindow);
        if (!sel.length) sel = pool.filter(inWindow); // por si el OCR leyó mal el número de fecha
        if (!sel.length && !rec.purchase && season) {
          const inYear = pool.filter(inSeason);
          if (inYear.length === 1) sel = inYear;
        }
        sel.sort((a, b) => a.date.localeCompare(b.date));
        if (sel.length > 1 && clubFirst && sel.some((m) => m.homeTeamId === clubId)) sel = sel.filter((m) => m.homeTeamId === clubId);
        const best = sel[0];
        if (!best) continue;
        found = true;
        const why = round && roundOk(best) ? `evento de la Fecha ${Number(round)}${season ? ` ${season}` : ""} y rival` : when ? `compra del ${when} y rival` : "evento y rival";
        if (!candidates.has(best.id)) candidates.set(best.id, { match: best, reason: why });
      }
      if (!found && when) unmatchedDates.push(when);
    }
  };

  const analyzeDated = (lines: string[]) => {
    const chunkText = lines.join("\n");
    const globalRivals = findRivals(chunkText);
    // Cada compra es una línea con fecha y el texto que la acompaña. En la tabla de "Mis compras" (escritorio) el
    // partido va en la misma línea que la fecha; en las tarjetas de la app, el nombre del partido va ARRIBA de la fecha.
    const dateLines = lines.flatMap((l, i) => (findDates(l).length ? [i] : []));
    const inline = dateLines.filter((i) => findRivals(lines[i]).length).length;
    const firstRivalLine = lines.findIndex((l) => findRivals(l).length > 0);
    const titleFirst = inline < dateLines.length / 2 && firstRivalLine >= 0 && firstRivalLine < dateLines[0];

    dateLines.forEach((i, k) => {
      const own = lines[i];
      const before = lines.slice(k === 0 ? 0 : dateLines[k - 1] + 1, i).join("\n");
      const after = lines.slice(i + 1, k + 1 < dateLines.length ? dateLines[k + 1] : lines.length).join("\n");
      const group = findRivals(own).length ? `${own}\n${after}` : titleFirst ? `${before}\n${own}` : `${own}\n${after}`;
      const rivals = findRivals(group);
      // Una compra que nombra un partido ("X vs. Y") con un rival que no reconocemos no se adivina por fecha.
      const namesUnknownMatch = !rivals.length && /\bvs\.?\s/i.test(group);
      const hint = competitionHint(group);
      const weekday = weekdayOf(own);
      for (const d of findDates(own)) {
        const when = d.year !== null ? `${pad(d.day)}/${pad(d.month)}/${d.year}` : `${pad(d.day)}/${pad(d.month)}`;
        const iso = d.year !== null ? `${d.year}-${pad(d.month)}-${pad(d.day)}` : null;
        let found: TicketCandidate[] = [];
        if (iso && rivals.length) {
          const start = Date.parse(iso) - 86_400_000;
          const end = Date.parse(iso) + PURCHASE_WINDOW_DAYS * 86_400_000;
          let pool = clubMatches.filter((m) => rivals.includes(rivalOf(m)) && Date.parse(m.date) >= start && Date.parse(m.date) <= end);
          if (hint && pool.some((m) => m.competitionId === hint)) pool = pool.filter((m) => m.competitionId === hint);
          // Para cada rival, el partido más cercano a la fecha.
          for (const rival of rivals) {
            const best = pool.filter((m) => rivalOf(m) === rival).sort((a, b) => a.date.localeCompare(b.date))[0];
            if (best) {
              const exact = dayDiff(best.date, iso) <= 1;
              found.push({ match: best, reason: exact ? `fecha ${when} y rival` : `compra del ${when} y rival` });
            }
          }
        } else if (!iso && rivals.length) {
          // Fecha sin año (tarjetas de la app: "lun. 24 feb."): el partido contra ese rival ese día; el día de la
          // semana define el año y, si no está, se toma el más reciente ya jugado.
          const md = `${pad(d.month)}-${pad(d.day)}`;
          for (const rival of rivals) {
            const pool = clubMatches.filter(
              (m) =>
                rivalOf(m) === rival &&
                m.date <= today &&
                m.date.slice(5) === md &&
                (weekday === null || new Date(`${m.date}T12:00:00Z`).getUTCDay() === weekday),
            );
            const best = pool.sort((a, b) => b.date.localeCompare(a.date))[0];
            if (best) found.push({ match: best, reason: `fecha ${when}${weekday === null ? "" : " (día de la semana)"} y rival` });
          }
        } else if (iso && !namesUnknownMatch) {
          const rivalsHere = rivals.length ? rivals : globalRivals;
          found = clubMatches
            .filter((m) => (rivalsHere.length === 0 || rivalsHere.includes(rivalOf(m))) && dayDiff(m.date, iso) <= 1)
            .map((m) => ({ match: m, reason: rivalsHere.length ? `fecha ${when} y rival mencionado` : `fecha ${when}` }));
        }
        for (const c of found) if (!candidates.has(c.match.id)) candidates.set(c.match.id, c);
        if (!found.length) unmatchedDates.push(when);
      }
    });
  };

  for (const lines of chunks) (isPortalLayout(lines) ? analyzePortal : analyzeDated)(lines);
  return {
    candidates: [...candidates.values()].sort((a, b) => b.match.date.localeCompare(a.match.date)),
    unmatchedDates: [...new Set(unmatchedDates)],
    providers,
  };
}

/** Etiquetas de las fichas de "Mis compras" en el celular (N° de Orden, Fecha Compra, Evento, Medio Pago…). */
const PORTAL_LABEL = /^(?:N\W{0,2}\s*de\s*Orden|Fecha\s+Compra|Evento|Medio\s*Pago|Tipo\s*Env|Total|Estado|VER)\b/i;

function isPortalLayout(lines: string[]): boolean {
  return lines.filter((l) => /^(?:Fecha\s+Compra|Medio\s*Pago|Tipo\s*Env)\b/i.test(l)).length >= 2;
}

export async function findTicketMatches(
  db: Db,
  clubId: string,
  text: string,
  index: TeamMentionIndex,
): Promise<TicketCandidate[]> {
  return (await analyzeTicket(db, clubId, text, index)).candidates;
}

// ----------------------------------------------------------------------------
// Ticketeras

export interface TicketProvider {
  id: string;
  name: string;
  /** Dónde encuentra el hincha su historial de compras. */
  history: string;
}

export const PROVIDERS: (TicketProvider & { pattern: RegExp })[] = [
  { id: "puntoticket", name: "PuntoTicket", history: "tu cuenta → historial de compras", pattern: /punto\s*ticket/i },
  { id: "ticketplus", name: "Ticketplus", history: "tus entradas en la web o la app", pattern: /ticket\s*plus/i },
  { id: "passline", name: "Passline", history: "Mis eTickets en la web o la app", pattern: /passline/i },
  { id: "ticketmaster", name: "Ticketmaster", history: "tus entradas en la web o la app (Ticketmaster o Quentro)", pattern: /ticketmaster|quentro/i },
  { id: "ohipass", name: "OHipass", history: "tu cuenta en OHipass", pattern: /ohi\s*pass/i },
  { id: "tienda-everton", name: "Tienda Everton", history: "tu cuenta en la Tienda Everton", pattern: /tienda\s*everton|tiendaeverton/i },
];

/** Ticketeras que aparecen en el texto de un comprobante (para mostrar "Leímos una entrada de Passline"). */
export function detectProviders(text: string): TicketProvider[] {
  return PROVIDERS.filter((p) => p.pattern.test(text)).map(({ id, name, history }) => ({ id, name, history }));
}
