import type { Db } from "./db/client.ts";
import { scorersSeen } from "./domain/scorers.ts";
import { computeAchievements } from "./domain/achievements.ts";
import { buildInsights } from "./domain/insights/index.ts";
import { buildCarnet, involves } from "./domain/stats.ts";
import { buildSuma } from "./domain/suma.ts";
import { goalsForAttended } from "./repo/goals.ts";
import { listAttended, listClubMatches } from "./repo/matches.ts";
import { getTeam, listClubs, listRivalries } from "./repo/teams.ts";
import type { User } from "./repo/users.ts";

/** Reúne todo lo necesario para mostrar el carnet de un hincha. */
export async function loadCarnet(db: Db, user: User, clubId: string = user.clubId) {
  const club = await getTeam(db, clubId);
  if (!club) throw new Error(`Club ${clubId} no existe`);
  const [allAttended, rivalries, clubMatches, goals, clubs] = await Promise.all([
    listAttended(db, user.id),
    listRivalries(db),
    listClubMatches(db, club.id),
    goalsForAttended(db, user.id),
    listClubs(db),
  ]);
  // Los partidos marcados que todavía no se juegan ("Voy") se muestran aparte y cuentan cuando se jueguen.
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = allAttended.filter((m) => m.date > today && involves(m, club.id)).sort((a, b) => a.date.localeCompare(b.date));
  const attended = allAttended.filter((m) => m.date <= today);
  const carnet = buildCarnet(attended, club.id, rivalries, clubMatches);
  const insights = buildInsights(attended, clubMatches, club.id, { today });
  const scorers = scorersSeen(attended, goals, club.id);
  const mine = new Set(attended.filter((m) => involves(m, club.id)).map((m) => m.id));
  const achievements = computeAchievements(carnet.total, mine, clubMatches, today);
  return { club, carnet, insights, attended, upcoming, scorers, goals, clubs, achievements };
}

/** Suma de los dos clubes del hincha (el principal y el segundo). */
export async function loadSuma(db: Db, user: User, secondClubId: string) {
  const [main, second, allAttended, goals] = await Promise.all([
    getTeam(db, user.clubId),
    getTeam(db, secondClubId),
    listAttended(db, user.id),
    goalsForAttended(db, user.id),
  ]);
  if (!main || !second) throw new Error("Club no existe");
  const today = new Date().toISOString().slice(0, 10);
  const attended = allAttended.filter((m) => m.date <= today);
  return { main, second, suma: buildSuma(attended, main.id, second.id, goals) };
}

/** Qué vista de la Galería se pide con ?club=: la del club principal, la del segundo o la suma. */
export type ClubView = "principal" | "segundo" | "suma";
export function parseClubView(v: string | undefined, hasSecond: boolean): ClubView {
  if (!hasSecond) return "principal";
  return v === "segundo" || v === "suma" ? v : "principal";
}
