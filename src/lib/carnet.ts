import type { Db } from "./db/client.ts";
import { scorersSeen } from "./domain/scorers.ts";
import { buildCarnet } from "./domain/stats.ts";
import { goalsForAttended } from "./repo/goals.ts";
import { listAttended, listClubMatches } from "./repo/matches.ts";
import { getTeam, listClubs, listRivalries } from "./repo/teams.ts";
import type { User } from "./repo/users.ts";

/** Reúne todo lo necesario para mostrar el carnet de un hincha. */
export async function loadCarnet(db: Db, user: User) {
  const club = await getTeam(db, user.clubId);
  if (!club) throw new Error(`Club ${user.clubId} no existe`);
  const [attended, rivalries, clubMatches, goals, clubs] = await Promise.all([
    listAttended(db, user.id),
    listRivalries(db),
    listClubMatches(db, club.id),
    goalsForAttended(db, user.id),
    listClubs(db),
  ]);
  const carnet = buildCarnet(attended, club.id, rivalries, clubMatches);
  const scorers = scorersSeen(attended, goals, club.id);
  return { club, carnet, attended, scorers, goals, clubs };
}
