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
export function loadCatalog(db: Db): TeamResolver {
  const competitions = readJson<{ id: string; name: string; kind: string; tier: number }[]>("catalog/competitions.json");
  const teams = readJson<CatalogTeam[]>("catalog/teams.json");
  const rivalries = readJson<{ id: string; name: string; teamA: string; teamB: string }[]>("catalog/rivalries.json");

  const upComp = db.prepare(
    `INSERT INTO competitions (id, name, kind, tier) VALUES (?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET name = excluded.name, kind = excluded.kind, tier = excluded.tier`,
  );
  for (const c of competitions) upComp.run(c.id, c.name, c.kind, c.tier);

  const upTeam = db.prepare(
    `INSERT INTO teams (id, name, short_name, city, color_primary, color_secondary, is_chilean) VALUES (?, ?, ?, ?, ?, ?, 1)
     ON CONFLICT(id) DO UPDATE SET name = excluded.name, short_name = excluded.short_name, city = excluded.city,
       color_primary = excluded.color_primary, color_secondary = excluded.color_secondary, is_chilean = 1`,
  );
  for (const t of teams) {
    upTeam.run(t.id, t.name, t.short ?? t.name, t.city ?? null, t.colors?.[0] ?? "#1f2937", t.colors?.[1] ?? "#ffffff");
  }

  const upRiv = db.prepare(
    `INSERT INTO rivalries (id, name, team_a, team_b) VALUES (?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET name = excluded.name, team_a = excluded.team_a, team_b = excluded.team_b`,
  );
  for (const r of rivalries) upRiv.run(r.id, r.name, r.teamA, r.teamB);

  return new TeamResolver(teams);
}

/** Crea (si no existe) un equipo que no está en el catálogo, p.ej. clubes amateur de Copa Chile o rivales extranjeros. */
export function ensureTeam(db: Db, name: string, chilean: boolean, country?: string): string {
  const id = chilean ? slugify(name) : `${slugify(name)}-${(country ?? "ext").toLowerCase()}`;
  db.prepare(
    `INSERT INTO teams (id, name, short_name, is_chilean) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO NOTHING`,
  ).run(id, name, name, chilean ? 1 : 0);
  return id;
}
