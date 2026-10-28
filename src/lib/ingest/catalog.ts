import { readFileSync } from "node:fs";
import path from "node:path";
import type { Db } from "../db/client.ts";
import { slugify, TeamResolver, type TeamCatalogEntry } from "../domain/normalize.ts";

export interface CatalogTeam extends TeamCatalogEntry {
  short?: string;
  city?: string;
  colors?: [string, string];
}

const dataDir = () => path.resolve(process.cwd(), "data");

export function readJson<T>(rel: string): T {
  return JSON.parse(readFileSync(path.join(dataDir(), rel), "utf8")) as T;
}

/** Carga competiciones, clubes y clásicos del catálogo versionado en data/catalog. */
export async function loadCatalog(db: Db): Promise<TeamResolver> {
  const competitions = readJson<{ id: string; name: string; kind: string; tier: number }[]>("catalog/competitions.json");
  const teams = readJson<CatalogTeam[]>("catalog/teams.json");
  const rivalries = readJson<{ id: string; name: string; teamA: string; teamB: string }[]>("catalog/rivalries.json");

  await db.transaction(async (tx) => {
    for (const c of competitions) {
      await tx.run(
        `INSERT INTO competitions (id, name, kind, tier) VALUES (?, ?, ?, ?)
         ON CONFLICT (id) DO UPDATE SET name = excluded.name, kind = excluded.kind, tier = excluded.tier`,
        c.id,
        c.name,
        c.kind,
        c.tier,
      );
    }
    for (const t of teams) {
      await tx.run(
        `INSERT INTO teams (id, name, short_name, city, color_primary, color_secondary, is_chilean) VALUES (?, ?, ?, ?, ?, ?, 1)
         ON CONFLICT (id) DO UPDATE SET name = excluded.name, short_name = excluded.short_name, city = excluded.city,
           color_primary = excluded.color_primary, color_secondary = excluded.color_secondary, is_chilean = 1`,
        t.id,
        t.name,
        t.short ?? t.name,
        t.city ?? null,
        t.colors?.[0] ?? "#1f2937",
        t.colors?.[1] ?? "#ffffff",
      );
    }
    for (const r of rivalries) {
      await tx.run(
        `INSERT INTO rivalries (id, name, team_a, team_b) VALUES (?, ?, ?, ?)
         ON CONFLICT (id) DO UPDATE SET name = excluded.name, team_a = excluded.team_a, team_b = excluded.team_b`,
        r.id,
        r.name,
        r.teamA,
        r.teamB,
      );
    }
  });

  return new TeamResolver(teams);
}

/** Id del equipo que no está en el catálogo (clubes amateur de Copa Chile, rivales extranjeros). */
export function externalTeamId(name: string, chilean: boolean, country?: string): string {
  return chilean ? slugify(name) : `${slugify(name)}-${(country ?? "ext").toLowerCase()}`;
}

/** Crea (si no existe) un equipo que no está en el catálogo. */
export async function ensureTeam(db: Db, name: string, chilean: boolean, country?: string): Promise<string> {
  const id = externalTeamId(name, chilean, country);
  await db.run(
    "INSERT INTO teams (id, name, short_name, is_chilean) VALUES (?, ?, ?, ?) ON CONFLICT (id) DO NOTHING",
    id,
    name,
    name,
    chilean ? 1 : 0,
  );
  return id;
}
