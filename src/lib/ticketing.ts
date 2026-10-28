/**
 * Dónde vende sus entradas cada club de Primera (data/catalog/ticketing.json, investigado y
 * verificado por dos agentes) y cómo encuentra el hincha sus comprobantes en cada ticketera.
 */
import catalog from "../../data/catalog/ticketing.json" with { type: "json" };
import { PROVIDERS, type TicketProvider } from "./ingest/tickets.ts";

export interface ClubTicketing {
  clubId: string;
  provider: TicketProvider | null;
  buyUrl: string | null;
  ownPortal: boolean;
}

interface CatalogEntry {
  clubId: string;
  provider: string | null;
  buyUrl: string | null;
  ownPortal: boolean;
}

const doc = catalog as { season: number; clubs: CatalogEntry[] };
const byClub = new Map(doc.clubs.map((c) => [c.clubId, c]));

export const CURRENT_SEASON = doc.season;
/** Clubes de Primera División en la temporada en curso. */
export const CURRENT_CLUBS: string[] = doc.clubs.map((c) => c.clubId);

export function clubTicketing(clubId: string): ClubTicketing | null {
  const c = byClub.get(clubId);
  if (!c) return null;
  const p = PROVIDERS.find((x) => x.id === c.provider);
  return {
    clubId,
    provider: p ? { id: p.id, name: p.name, history: p.history } : null,
    buyUrl: c.buyUrl,
    ownPortal: c.ownPortal,
  };
}

/** Ticketeras usadas por los clubes de Primera, con los clubes de cada una. */
export function providersInUse(): { provider: TicketProvider; clubs: string[] }[] {
  const out = new Map<string, { provider: TicketProvider; clubs: string[] }>();
  for (const c of doc.clubs) {
    const t = clubTicketing(c.clubId);
    if (!t?.provider) continue;
    const e = out.get(t.provider.id) ?? { provider: t.provider, clubs: [] };
    e.clubs.push(c.clubId);
    out.set(t.provider.id, e);
  }
  return [...out.values()].sort((a, b) => b.clubs.length - a.clubs.length);
}
