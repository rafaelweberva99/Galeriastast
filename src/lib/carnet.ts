import type { Db } from "./db/client.ts";
import { scorersSeen } from "./domain/scorers.ts";
import { computeAchievements } from "./domain/achievements.ts";
import { buildInsights } from "./domain/insights/index.ts";
import { buildCarnet, involves } from "./domain/stats.ts";
import { goalsForAttended } from "./repo/goals.ts";
import { listAttended, listClubMatches } from "./repo/matches.ts";
import { getTeam, listClubs, listRivalries } from "./repo/teams.ts";
import type { User } from "./repo/users.ts";

/** Reúne todo lo necesario para mostrar el carnet de un hincha. */
export async function loadCarnet(db: Db, user: User) {
  const club = await getTeam(db, user.clubId);
  if (!club) throw new Error(`Club ${user.clubId} no existe`);
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
