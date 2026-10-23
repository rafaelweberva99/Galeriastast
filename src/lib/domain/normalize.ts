/** Convierte un nombre a slug ASCII: "Unión Española" -> "union-espanola". */
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export interface TeamCatalogEntry {
  id: string;
  name: string;
  aliases?: string[];
}

/**
 * Resuelve nombres de equipos tal como vienen de cada fuente
 * ("U. de Chile", "Universidad de Chile", "CF Universidad de Chile"...) a un id canónico.
 */
export class TeamResolver {
  private readonly bySlug = new Map<string, string>();

  constructor(catalog: TeamCatalogEntry[]) {
    for (const t of catalog) {
      for (const name of [t.id, t.name, ...(t.aliases ?? [])]) {
        const slug = slugify(name);
        const prev = this.bySlug.get(slug);
        if (prev && prev !== t.id) throw new Error(`Alias ambiguo "${name}" para ${prev} y ${t.id}`);
        this.bySlug.set(slug, t.id);
      }
    }
  }

  resolve(name: string): string | null {
    return this.bySlug.get(slugify(name)) ?? null;
  }
}

/** Id determinístico de partido: permite deduplicar entre fuentes. */
export function matchId(date: string, homeTeamId: string, awayTeamId: string): string {
  return `${date}_${homeTeamId}_${awayTeamId}`;
}
