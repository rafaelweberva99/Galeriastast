import { currentUser } from "./auth.ts";
import { loadCarnet } from "./carnet.ts";
import type { Db } from "./db/client.ts";
import { buildSide, commonMatches, normalizeHandle, type CommonSummary, type FanSide } from "./domain/comparar.ts";
import type { ScorersReport } from "./domain/scorers.ts";
import type { Goal } from "./domain/types.ts";
import { goalsForMatches } from "./repo/goals.ts";
import { getUserByUsername, safeDecode, type User } from "./repo/users.ts";
import type { Team } from "./repo/teams.ts";

export type ResolveError = "sin-sesion" | "no-disponible" | "mismo";

/** Resuelve "yo" o "@usuario". Solo perfiles públicos (o el propio). Inexistente y privado dan el mismo error a propósito. */
export async function resolveFan(db: Db, raw: string, viewer: User | null): Promise<{ user: User } | { error: ResolveError }> {
  const handle = normalizeHandle(safeDecode(raw));
  if (handle.toLowerCase() === "yo") return viewer ? { user: viewer } : { error: "sin-sesion" };
  const user = await getUserByUsername(db, handle);
  if (!user || (!user.isPublic && viewer?.id !== user.id)) return { error: "no-disponible" };
  return { user };
}

export interface Duelo {
  a: FanSide;
  b: FanSide;
  clubA: Team;
  clubB: Team;
  common: CommonSummary;
  goals: Map<string, Goal[]>;
  scorersA: ScorersReport;
  scorersB: ScorersReport;
  /** Se puede compartir solo si los dos perfiles son públicos. */
  shareable: boolean;
}

export async function loadDuelo(db: Db, rawA: string, rawB: string): Promise<{ duelo: Duelo } | { error: ResolveError }> {
  const viewer = await currentUser();
  const [ra, rb] = [await resolveFan(db, rawA, viewer), await resolveFan(db, rawB, viewer)];
  if ("error" in ra) return { error: ra.error };
  if ("error" in rb) return { error: rb.error };
  if (ra.user.id === rb.user.id) return { error: "mismo" };
  const [ca, cb] = await Promise.all([loadCarnet(db, ra.user), loadCarnet(db, rb.user)]);
  const common = commonMatches(ca.attended, cb.attended, ca.club.id, cb.club.id);
  const goals = await goalsForMatches(db, common.matches.map((c) => c.match.id));
  const side = (u: User, c: typeof ca) =>
    buildSide({ username: u.username, memberId: u.id, club: c.club, carnet: c.carnet, insights: c.insights, scorers: c.scorers });
  return {
    duelo: {
      a: side(ra.user, ca),
      b: side(rb.user, cb),
      clubA: ca.club,
      clubB: cb.club,
      common,
      goals,
      scorersA: ca.scorers,
      scorersB: cb.scorers,
      shareable: ra.user.isPublic && rb.user.isPublic,
    },
  };
}
